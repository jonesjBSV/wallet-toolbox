import {
  Beef,
  ListOutputsResult,
  OriginatorDomainNameStringUnder250Bytes,
  WalletOutput
} from '@bsv/sdk'
import { TableOutput, TableOutputBasket, TableOutputTag } from '../index.client'
import { asString, sdk, verifyId, verifyOne } from '../../index.client'
import { StorageKnex } from '../StorageKnex'
import { ValidListOutputsArgs } from '../../sdk'

interface SpecOp {
  name: string
  useBasket?: string
  ignoreLimit?: boolean
  resultFromOutputs?: (
    s: StorageKnex,
    vargs: ValidListOutputsArgs,
    outputs: TableOutput[]
  ) => Promise<ListOutputsResult>
  filterOutputs?: (
    s: StorageKnex,
    vargs: ValidListOutputsArgs,
    outputs: TableOutput[]
  ) => Promise<TableOutput[]>
}

const basketToSpecOp: Record<string, SpecOp> = {
  f61dc9289ceea604247ebde125b93a4099931f69c0e95ecd43ce0a480b9bb6c9: {
    name: 'reserved...'
  },
  '69a57cc2b34058d5218927ecfd3e9e4254d8395b6fda9d57c689c753c6d6cad5': {
    name: 'reserved...'
  },
  '893b7646de0e1c9f741bd6e9169b76a8847ae34adef7bef1e6a285371206d2e8': {
    name: 'totalOutputsIsWalletBalance',
    useBasket: 'default',
    ignoreLimit: true,
    resultFromOutputs: async (
      s: StorageKnex,
      vargs: ValidListOutputsArgs,
      outputs: TableOutput[]
    ): Promise<ListOutputsResult> => {
      let totalOutputs = 0
      for (const o of outputs) totalOutputs += o.satoshis
      return { totalOutputs, outputs: [] }
    }
  },
  '5a76fd430a311f8bc0553859061710a4475c19fed46e2ff95969aa918e612e57': {
    name: 'invalidChangeOutputs',
    useBasket: 'default',
    ignoreLimit: true,
    filterOutputs: async (
      s: StorageKnex,
      vargs: ValidListOutputsArgs,
      outputs: TableOutput[]
    ): Promise<TableOutput[]> => {
      const filteredOutputs: TableOutput[] = []
      let ok = false

      for (const o of outputs) {
        if (o.lockingScript && o.lockingScript.length > 0) {
          const r = await s
            .getServices()
            .getUtxoStatus(asString(o.lockingScript), 'script')
          if (r.status === 'success' && r.isUtxo && r.details?.length > 0) {
            if (
              r.details.some(
                d =>
                  d.txid === o.txid &&
                  d.satoshis === o.satoshis &&
                  d.index === o.vout
              )
            ) {
              ok = true
            }
          }
        }

        if (!ok) {
          filteredOutputs.push(o)
        }
      }
      if (vargs.tags[0] === 'release') {
        for (const o of filteredOutputs) {
          await s.updateOutput(o.outputId, { spendable: false })
        }
      }
      return filteredOutputs
    }
  }
}

export async function listOutputs(
  dsk: StorageKnex,
  auth: sdk.AuthId,
  vargs: sdk.ValidListOutputsArgs,
  originator?: OriginatorDomainNameStringUnder250Bytes
): Promise<ListOutputsResult> {
  const trx: sdk.TrxToken | undefined = undefined
  const userId = verifyId(auth.userId)
  const limit = vargs.limit
  const offset = vargs.offset

  const k = dsk.toDb(trx)

  const r: ListOutputsResult = {
    totalOutputs: 0,
    outputs: []
  }

  /*
        ListOutputsArgs {
            basket: BasketStringUnder300Bytes

            tags?: OutputTagStringUnder300Bytes[]
            tagQueryMode?: 'all' | 'any' // default any

            limit?: PositiveIntegerDefault10Max10000
            offset?: PositiveIntegerOrZero
        }
    */

  let specOp: SpecOp | undefined = undefined
  let basketId: number | undefined = undefined
  const basketsById: Record<number, TableOutputBasket> = {}
  if (vargs.basket) {
    let b = vargs.basket
    specOp = basketToSpecOp[b]
    b = specOp ? (specOp.useBasket ? specOp.useBasket : '') : b
    if (b) {
      const baskets = await dsk.findOutputBaskets({
        partial: { userId, name: b },
        trx
      })
      if (baskets.length !== 1) {
        // If basket does not exist, result is no outputs.
        return r
      }
      const basket = baskets[0]
      basketId = basket.basketId!
      basketsById[basketId!] = basket
    }
  }

  let tagIds: number[] = []
  if (vargs.tags && vargs.tags.length > 0) {
    const q = k<TableOutputTag>('output_tags')
      .where({
        userId: userId,
        isDeleted: false
      })
      .whereNotNull('outputTagId')
      .whereIn('tag', vargs.tags)
      .select('outputTagId')
    const r = await q
    tagIds = r.map(r => r.outputTagId!)
  }

  const isQueryModeAll = vargs.tagQueryMode === 'all'
  if (isQueryModeAll && tagIds.length < vargs.tags.length) return r

  const columns: string[] = [
    'outputId',
    'transactionId',
    'basketId',
    'spendable',
    'txid',
    'vout',
    'satoshis',
    'lockingScript',
    'customInstructions',
    'outputDescription',
    'spendingDescription',
    'scriptLength',
    'scriptOffset'
  ]

  const noTags = tagIds.length === 0
  const includeSpent = false

  const txStatusOk = `(select status as tstatus from transactions where transactions.transactionId = outputs.transactionId) in ('completed', 'unproven', 'nosend')`
  const txStatusOkCteq = `(select status as tstatus from transactions where transactions.transactionId = o.transactionId) in ('completed', 'unproven', 'nosend')`

  const makeWithTagsQueries = () => {
    let cteqOptions = ''
    if (basketId) cteqOptions += ` AND o.basketId = ${basketId}`
    if (!includeSpent) cteqOptions += ` AND o.spendable`
    const cteq = k.raw(`
            SELECT ${columns.map(c => 'o.' + c).join(',')}, 
                    (SELECT COUNT(*) 
                    FROM output_tags_map AS m 
                    WHERE m.OutputId = o.OutputId 
                    AND m.outputTagId IN (${tagIds.join(',')}) 
                    ) AS tc
            FROM outputs AS o
            WHERE o.userId = ${userId} ${cteqOptions} AND ${txStatusOkCteq}
            `)

    const q = k.with('otc', cteq)
    q.from('otc')
    if (isQueryModeAll) q.where('tc', tagIds.length)
    else q.where('tc', '>', 0)
    const qcount = q.clone()
    q.select(columns)
    qcount.count('outputId as total')
    return { q, qcount }
  }

  const makeWithoutTagsQueries = () => {
    const where: Partial<TableOutput> = { userId }
    if (basketId) where.basketId = basketId
    if (!includeSpent) where.spendable = true
    const q = k('outputs').where(where).whereRaw(txStatusOk)
    const qcount = q.clone().count('outputId as total')
    return { q, qcount }
  }

  const { q, qcount } = noTags
    ? makeWithoutTagsQueries()
    : makeWithTagsQueries()

  // Sort order when limit and offset are possible must be ascending for determinism.
  if (!specOp || !specOp.ignoreLimit) q.limit(limit).offset(offset)

  q.orderBy('outputId', 'asc')

  let outputs: TableOutput[] = await q

  if (specOp) {
    if (specOp.filterOutputs)
      outputs = await specOp.filterOutputs(dsk, vargs, outputs)
    if (specOp.resultFromOutputs) {
      const r = await specOp.resultFromOutputs(dsk, vargs, outputs)
      return r
    }
  }

  if (!limit || outputs.length < limit) r.totalOutputs = outputs.length
  else {
    const total = verifyOne(await qcount)['total']
    r.totalOutputs = Number(total)
  }

  /*
        ListOutputsArgs {
            include?: 'locking scripts' | 'entire transactions'
            includeCustomInstructions?: BooleanDefaultFalse
            includeTags?: BooleanDefaultFalse
            includeLabels?: BooleanDefaultFalse
        }

        ListOutputsResult {
            totalOutputs: PositiveIntegerOrZero
            BEEF?: BEEF
            outputs: Array<WalletOutput>
        }

        WalletOutput {
            satoshis: SatoshiValue
            spendable: boolean
            outpoint: OutpointString

            customInstructions?: string
            lockingScript?: HexString
            tags?: OutputTagStringUnder300Bytes[]
            labels?: LabelStringUnder300Bytes[]
        }
    */

  const labelsByTxid: Record<string, string[]> = {}

  const beef = new Beef()

  for (const o of outputs) {
    const wo: WalletOutput = {
      satoshis: Number(o.satoshis),
      spendable: !!o.spendable,
      outpoint: `${o.txid}.${o.vout}`
    }
    r.outputs.push(wo)
    //if (vargs.includeBasket && o.basketId) {
    //    if (!basketsById[o.basketId]) {
    //        basketsById[o.basketId] = verifyTruthy(await dsk.findOutputBasketId(o.basketId!, trx))
    //    }
    //    wo.basket = basketsById[o.basketId].name
    //}
    if (vargs.includeCustomInstructions && o.customInstructions)
      wo.customInstructions = o.customInstructions
    if (vargs.includeLabels && o.txid) {
      if (labelsByTxid[o.txid] === undefined) {
        labelsByTxid[o.txid] = (
          await dsk.getLabelsForTransactionId(o.transactionId, trx)
        ).map(l => l.label)
      }
      wo.labels = labelsByTxid[o.txid]
    }
    if (vargs.includeTags) {
      wo.tags = (await dsk.getTagsForOutputId(o.outputId, trx)).map(t => t.tag)
    }
    if (vargs.includeLockingScripts) {
      await dsk.validateOutputScript(o, trx)
      if (o.lockingScript) wo.lockingScript = asString(o.lockingScript)
    }
    if (vargs.includeTransactions && !beef.findTxid(o.txid!)) {
      await dsk.getValidBeefForKnownTxid(
        o.txid!,
        beef,
        undefined,
        vargs.knownTxids,
        trx
      )
    }
  }

  if (vargs.includeTransactions) {
    r.BEEF = beef.toBinary()
  }

  return r
}
