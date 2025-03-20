import { Beef, Transaction } from '@bsv/sdk'
import { StorageProvider } from '../StorageProvider'
import { EntityProvenTxReq } from '../schema/entities'
import { sdk, Services } from '../../index.all'

/**
 * Attempt to post one or more `ProvenTxReq` with status 'unsent'
 * to the bitcoin network.
 * 
 * @param reqs
 */
export async function attemptToPostReqsToNetwork(
  storage: StorageProvider,
  reqs: EntityProvenTxReq[],
  trx?: sdk.TrxToken
): Promise<PostReqsToNetworkResult> {
  const r: PostReqsToNetworkResult = {
    status: 'success',
    beef: new Beef(),
    details: [],
    log: ''
  }
  for (const req of reqs) {
    r.details.push({
      txid: req.txid,
      req,
      status: 'unknown',
      pbrft: {
        txid: req.txid,
        status: 'error'
      },
      data: undefined,
      error: undefined
    })
  }
  const txids = reqs.map(r => r.txid)

  let invalid: boolean = false
  for (const rb of reqs) {
    let badReq: boolean = false
    if (!rb.rawTx) {
      badReq = true
      rb.addHistoryNote({ what: 'postToNetworkError', error: 'no rawTx' })
    }
    if (!rb.notify.transactionIds || rb.notify.transactionIds.length < 1) {
      badReq = true
      rb.addHistoryNote({ what: 'postToNetworkError', error: 'no notify tx' })
    }
    if (rb.attempts > 10) {
      badReq = true
      rb.addHistoryNote({ what: 'postToNetworkError', error: 'too many attempts', attempts: rb.attempts })
    }

    // Accumulate batch beefs.
    if (!badReq) {
      try {
        await storage.mergeReqToBeefToShareExternally(rb.api, r.beef, [], trx)
      } catch (eu: unknown) {
        const e = sdk.WalletError.fromUnknown(eu)
        if (e.code === 'WERR_INVALID_PARAMETER' && (e as sdk.WERR_INVALID_PARAMETER).parameter === 'txid') {
          badReq = true
          rb.addHistoryNote({ what: 'postToNetworkError', error: 'depends on unknown txid' })
        }
      }
    }

    if (badReq) invalid = true
  }

  if (invalid) {
    for (const req of reqs) {
      // batch passes or fails as a whole...prior to post to network attempt.
      req.status = 'invalid'
      await req.updateStorageDynamicProperties(storage)
      r.log += `status set to ${req.status}\n`
    }
    return r
  }

  // Use cwi-external-services to post the aggregate beef
  // and add the new results to aggregate results.
  const services = await storage.getServices()
  const pbrs = await services.postBeef(r.beef, txids)

  // post beef results is an array by service provider
  // for each service provider, there's an aggregate result and individual results by txid.

  await transferNotesToReqHistories(txids, reqs, pbrs, storage, trx)

  const apbrs = aggregatePostBeefResultsByTxid(txids, reqs, pbrs)

  await updateReqsFromAggregateResults(txids, r.beef, apbrs, storage, services, trx)

  // Fetch the updated history.
  // log += .req.historyPretty(since, indent + 2)
  return r
}

export type PostReqsToNetworkDetailsStatus = 'success' | 'doubleSpend' | 'unknown'

export interface PostReqsToNetworkDetails {
  txid: string
  req: EntityProvenTxReq
  status: PostReqsToNetworkDetailsStatus
  pbrft: sdk.PostTxResultForTxid
  data?: string
  error?: string
}

export interface PostReqsToNetworkResult {
  status: 'success' | 'error'
  beef: Beef
  details: PostReqsToNetworkDetails[]
  pbr?: sdk.PostBeefResult
  log: string
}

async function transferNotesToReqHistories(txids: string[], reqs: EntityProvenTxReq[], pbrs: sdk.PostBeefResult[], storage: StorageProvider, trx?: sdk.TrxToken)
: Promise<void>
{
  for (const txid of txids) {
    const req = reqs.find(r => r.txid === txid)
    if (!req) throw new sdk.WERR_INTERNAL();
    const notes: sdk.ReqHistoryNote[] = []
    for (const pbr of pbrs) {
      notes.push(...(pbr.notes || []))
      const r = pbr.txidResults.find(tr => tr.txid === txid)
      if (r) notes.push(...(r.notes || []))
    }
    for (const n of notes) {
      req.addHistoryNote(n)
    }
    await req.updateStorageDynamicProperties(storage, trx)
  }
}

/**
 * For each txid, decide on the aggregate success or failure of attempting to broadcast it to the bitcoin processing network.
 * 
 * Possible results:
 * 1. Success: At least one success, no double spends.
 * 2. DoubleSpend: One or more double spends.
 * 3. InvalidTransaction: No success, no double spend, one or more non-exception errors.
 * 4. Service Failure: No results or all results are exception errors.
 * 
 * @param txids 
 * @param reqs 
 * @param pbrs 
 * @param storage 
 * @returns 
 */
function aggregatePostBeefResultsByTxid(txids: string[], reqs: EntityProvenTxReq[], pbrs: sdk.PostBeefResult[])
: Record<string, AggregatePostBeefTxResult>
{
  const r: Record<string, AggregatePostBeefTxResult> = {}

  for (const txid of txids) {
    const req = reqs.find(r => r.txid === txid)!
    const ar: AggregatePostBeefTxResult = {
      txid,
      req,
      txidResults: [],
      status: 'success',
      successCount: 0,
      doubleSpendCount: 0,
      statusErrorCount: 0,
      serviceErrorCount: 0,
      competingTxs: []
    }
    r[txid] = ar
    for (const pbr of pbrs) {
      const tr = pbr.txidResults.find(tr => tr.txid === txid)
      if (tr) {
        ar.txidResults.push(tr)
        if (tr.status === 'success')
          ar.successCount++
        else if (tr.doubleSpend) {
          ar.doubleSpendCount++
          if (tr.competingTxs) {
            ar.competingTxs = [...tr.competingTxs]
          }
        } else if (tr.serviceError)
          ar.serviceErrorCount++
        else
          ar.statusErrorCount++
      }
      if (ar.competingTxs.length > 1)
        ar.competingTxs = [...new Set(ar.competingTxs)] // Remove duplicates
    }

    if (ar.successCount > 0 && ar.doubleSpendCount === 0)
      ar.status = 'success'
    else if (ar.doubleSpendCount > 0)
      ar.status = 'doublespend'
    else if (ar.statusErrorCount > 0)
      ar.status = 'invalidTx'
    else
      ar.status = 'serviceError'
  }

  return r
}

type AggregateStatus = 'success' | 'doublespend' | 'invalidTx' | 'serviceError'

interface AggregatePostBeefTxResult {
  txid: string
  txidResults: sdk.PostTxResultForTxid[]
  status: AggregateStatus
  req: EntityProvenTxReq
  successCount: number
  doubleSpendCount: number
  statusErrorCount: number
  serviceErrorCount: number
  /**
   * Any competing double spend txids reported for this txid
   */
  competingTxs: string[]
}

/**
 * For each txid in submitted `txids`:
 * 
 *   Based on its aggregate status, and whether broadcast happening in background (isDelayed) or immediately (!isDelayed),
 *   and iff current req.status is not 'unproven' or 'completed':
 * 
 *     'success':
 *       req.status => 'unmined', tx.status => 'unproven'
 *     'doubleSpend':
 *       req.status => 'doubleSpend', tx.status => 'failed'
 *     'invalidTx':
 *       req.status => 'invalid', tx.status => 'failed'
 *     'serviceError':
 *       increment req.attempts
 * 
 * @param txids 
 * @param apbrs 
 * @param storage
 * @param services if valid, doubleSpend results will be verified (but only if not within a trx. e.g. trx must be undefined)
 * @param trx 
 */
async function updateReqsFromAggregateResults(
  txids: string[],
  beef: Beef,
  apbrs: Record<string, AggregatePostBeefTxResult>,
  storage: StorageProvider,
  services?: sdk.WalletServices,
  trx?: sdk.TrxToken
)
: Promise<void>
{
  for (const txid of txids) {
    const ar = apbrs[txid]!
    await ar.req.refreshFromStorage(storage, trx)
    if (['completed', 'unmined'].indexOf(ar.req.status) >= 0)
      // However it happened, don't degrade status if it is somehow already beyond broadcast stage
      continue;
    
    let newReqStatus: sdk.ProvenTxReqStatus | undefined = undefined
    let newTxStatus: sdk.TransactionStatus | undefined = undefined
    switch (ar.status) {
      case 'success':
        newReqStatus = 'unmined'
        newTxStatus = 'unproven'
        break;
      case 'doublespend':
        newReqStatus = 'doubleSpend'
        newTxStatus = 'failed'
        if (services && !trx) await confirmDoubleSpend(ar, beef, storage, services)
        break;
      case 'invalidTx':
        newReqStatus = 'invalid'
        newTxStatus = 'failed'
        break;
      case 'serviceError':
        newReqStatus = 'sending'
        newTxStatus = 'sending'
        ar.req.attempts++
        break;
      default:
        throw new sdk.WERR_INTERNAL(`unimplemented AggregateStatus ${ar.status}`)
    }


    if (newReqStatus)
      ar.req.status = newReqStatus;

    await ar.req.updateStorageDynamicProperties(storage, trx)

    if (newTxStatus) {
      const ids = ar.req.notify.transactionIds
      if (ids) {
        // Also set generated outputs to spendable false and consumed input outputs to spendable true (and clears their spentBy).
        await storage.updateTransactionsStatus(ids, newTxStatus, trx);
      }
    }
  }

}

/**
 * Requires ar.status === 'doubleSpend'
 * 
 * Parse the rawTx and review each input as a possible double spend.
 * 
 * @param ar 
 * @param storage 
 * @param services 
 */
async function confirmDoubleSpend(ar: AggregatePostBeefTxResult, beef: Beef, storage: StorageProvider, services: sdk.WalletServices)
: Promise<void>
{
  const tx = Transaction.fromBinary(ar.req.rawTx)
  for (const input of tx.inputs) {
    const sourceTx = beef.findTxid(input.sourceTXID!)?.tx
    if (!sourceTx) throw new sdk.WERR_INTERNAL(`beef lacks tx for ${input.sourceTXID}`)
    const lockingScript = sourceTx.outputs[input.sourceOutputIndex].lockingScript.toHex()
    const hash = services.hashOutputScript(lockingScript)
    const usr = await services.getUtxoStatus(hash, undefined ,`${sourceTx.id('hex')}.$`)

  }
}

