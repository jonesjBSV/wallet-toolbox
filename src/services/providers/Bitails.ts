import { Beef, defaultHttpClient, HexString, HttpClient, MerklePath, Utils } from '@bsv/sdk'
import { doubleSha256BE, sdk, wait } from '../../index.client'
import { ReqHistoryNote } from '../../sdk'

export interface BitailsConfig {
  /** Authentication token for BitTails API */
  apiKey?: string
  /** The HTTP client used to make requests to the API. */
  httpClient?: HttpClient
}

/**
 *
 */
export class Bitails {
  readonly chain: sdk.Chain
  readonly apiKey: string
  readonly URL: string
  readonly httpClient: HttpClient

  constructor(chain: sdk.Chain = 'main', config: BitailsConfig = {}) {
    const { apiKey, httpClient } = config
    this.chain = chain
    this.URL =
      chain === 'main'
        ? `https://api.bitails.io/`
        : `https://test-api.bitails.io/`
    this.httpClient = httpClient ?? defaultHttpClient()
    this.apiKey = apiKey ?? ''
  }

  getHttpHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    }

    if (typeof this.apiKey === 'string' && this.apiKey.trim() !== '') {
      headers.Authorization = this.apiKey
    }

    return headers
  }

  /**
   * Bitails does not natively support a postBeef end-point aware of multiple txids of interest in the Beef.
   *
   * Send rawTx in `txids` order from beef.
   *
   * @param beef
   * @param txids
   * @returns
   */
  async postBeef(beef: Beef, txids: string[]): Promise<sdk.PostBeefResult> {
    const nn = () => ({
      name: 'BitailsPostBeef',
      when: new Date().toISOString()
    })
    const nne = () => ({ ...nn(), beef: beef.toHex(), txids: txids.join(',') })

    const note: ReqHistoryNote = { ...nn(), what: 'postBeef' }

    const raws: string[] = []
    for (const txid of txids) {
      const rawTx = Utils.toHex(beef.findTxid(txid)!.rawTx!)
      raws.push(rawTx)
    }

    const r = await this.postRaws(raws)

    r.notes!.unshift(note)
    if (r.status !== 'success')
      r.notes!.push({ ...nne(), what: 'postBeefError' })
    else r.notes!.push({ ...nn(), what: 'postBeefSuccess' })

    return r
  }

  /**
   * @param raws Array of raw transactions to broadcast as hex strings
   * @returns
   */
  async postRaws(raws: HexString[]): Promise<sdk.PostBeefResult> {
    const r: sdk.PostBeefResult = {
      name: 'BitailsPostRaws',
      status: 'success',
      txidResults: [],
      notes: []
    }

    for (const raw of raws) {
      const txid = Utils.toHex(doubleSha256BE(Utils.toArray(raw, 'hex')))
      r.txidResults.push({
        txid,
        status: 'success',
        notes: []
      })
    }

    const headers = this.getHttpHeaders()
    headers['Content-Type'] = 'application/json'
    //headers['Accept'] = 'text/json'

    //const data = JSON.stringify({ raws })
    const data = { raws: raws }
    const requestOptions = {
      method: 'POST',
      headers,
      data
    }

    const url = `${this.URL}tx/broadcast/multi`
    const nn = () => ({
      name: 'BitailsPostRawTx',
      when: new Date().toISOString()
    })
    const nne = () => ({
      ...nn(),
      raws: raws.join(','),
      txids: r.txidResults.map(r => r.txid).join(','),
      url
    })

    const retryLimit = 5
    for (let retry = 0; retry < retryLimit; retry++) {
      try {
        const response = await this.httpClient.request<BitailsPostRawsResult[]>(
          url,
          requestOptions
        )
        if (response.statusText === 'Too Many Requests' && retry < 2) {
          r.notes!.push({ ...nn(), what: 'postRawsRateLimit' })
          await wait(2000)
          continue
        }
        if (response.ok) {
          // status: 201, statusText: 'Created'
          const btrs: BitailsPostRawsResult[] = response.data
          for (const rt of r.txidResults) {
            const btr = btrs.find(btr => (btr.txid = rt.txid))
            if (!btr) {
              rt.status = 'error'
              rt.notes!.push({
                ...nne(),
                what: 'postRawsMissingResult',
                txid: rt.txid
              })
            } else if (btr.error) {
              // code: -25, message: 'missing-inputs'
              rt.status = 'error'
              rt.notes!.push({
                ...nne(),
                what: 'postRawsError',
                txid: rt.txid,
                code: btr.error.code,
                message: btr.error.message
              })
            } else {
              rt.notes!.push({ ...nn(), what: 'postRawsSuccess' })
            }
            if (rt.status !== 'success' && r.status === 'success')
              r.status = 'error'
          }
        } else {
          r.status = 'error'
          const n: ReqHistoryNote = {
            ...nne(),
            what: 'postRawsError'
          }
          r.notes!.push(n)
        }
      } catch (eu: unknown) {
        r.status = 'error'
        const e = sdk.WalletError.fromUnknown(eu)
        r.notes!.push({
          ...nne(),
          what: 'postRawsCatch',
          code: e.code,
          description: e.description
        })
      }
      return r
    }
    r.status = 'error'
    r.notes!.push({
      ...nne(),
      what: 'postRawsRetryLimit',
      retryLimit
    })
    return r
  }

  async getMerklePath(
    txid: string,
    services: sdk.WalletServices
  ): Promise<sdk.GetMerklePathResult> {
    const r: sdk.GetMerklePathResult = { name: 'BitailsTsc', notes: [] }

    const headers = this.getHttpHeaders()
    const requestOptions = {
      method: 'GET',
      headers
    }

    for (let retry = 0; retry < 2; retry++) {
      try {
        /*
        const response = await this.httpClient.request<
          string
        >(`${this.URL}/tx/${txid}/proof/tsc`, requestOptions)

        if (response.statusText === 'Too Many Requests' && retry < 2) {
          r.notes!.push({
            what: 'getMerklePathRetry',
            name: r.name,
            status: response.status,
            statusText: response.statusText
          })
          await wait(2000)
          continue
        }

        if (response.status === 404 && response.statusText === 'Not Found') {
          r.notes!.push({
            what: 'getMerklePathNotFound',
            name: r.name,
            status: response.status,
            statusText: response.statusText
          })
          return r
        }

        if (
          !response.ok ||
          response.status !== 200 ||
          response.statusText !== 'OK'
        ) {
          r.notes!.push({
            what: 'getMerklePathBadStatus',
            name: r.name,
            status: response.status,
            statusText: response.statusText
          })
          throw new sdk.WERR_INVALID_PARAMETER(
            'txid',
            `valid transaction. '${txid}' response ${response.statusText}`
          )
        }

        if (!response.data) {
          // Unmined, proof not yet available.
          r.notes!.push({
            what: 'getMerklePathNoData',
            name: r.name,
            status: response.status,
            statusText: response.statusText
          })
          return r
        }

        if (!Array.isArray(response.data)) response.data = [response.data]

        if (response.data.length != 1) return r

        const p = response.data[0]
        const header = await services.hashToHeader(p.target)
        if (header) {
          const proof = {
            index: p.index,
            nodes: p.nodes,
            height: header.height
          }
          //r.merklePath = convertProofToMerklePath(txid, proof)
          r.header = header
          r.notes!.push({
            what: 'getMerklePathSuccess',
            name: r.name,
            status: response.status,
            statusText: response.statusText
          })
        } else {
          r.notes!.push({
            what: 'getMerklePathNoHeader',
            target: p.target,
            name: r.name,
            status: response.status,
            statusText: response.statusText
          })
          throw new sdk.WERR_INVALID_PARAMETER(
            'blockhash',
            'a valid on-chain block hash'
          )
        }
          */
      } catch (eu: unknown) {
        const e = sdk.WalletError.fromUnknown(eu)
        r.notes!.push({
          what: 'getMerklePathError',
          name: r.name,
          code: e.code,
          description: e.description
        })
        r.error = e
      }
      return r
    }
    r.notes!.push({ what: 'getMerklePathInternal', name: r.name })
    throw new sdk.WERR_INTERNAL()
  }
}

interface BitailsPostRawsResult {
  txid: string
  error?: {
    code: number
    message: string
  }
}

export interface BitailsMerkleProofBranch {
  pos: 'L' | 'R'
  hash: string
}

export interface BitailsMerkleProof {
  blockhash: string
  hash: string
  merkleRoot: string
  branches: BitailsMerkleProofBranch[]
}

export function convertProofToMerklePath(
  blockHeight: number,
  proof: BitailsMerkleProof
): MerklePath {
  const treeHeight = proof.branches.length
  type Leaf = {
    offset: number
    hash?: string
    txid?: boolean
    duplicate?: boolean
  }
  const path: Leaf[][] = Array(treeHeight)
    .fill(0)
    .map(() => []);

  for (let level = 0; level < treeHeight; level++) {
    const branch = proof.branches[level]
    path[level].push({
      offset: branch.pos === 'L' ? 0 : 1, // These need adjusting...
      hash: branch.hash.length === 64 ? branch.hash : undefined,
      txid: false,
      duplicate: branch.hash.length !== 64 ? true : undefined
    })
  }
  // Adjust the offsets
  let offset = 0
  for (let level = treeHeight - 1; level >= 0; level--) {
    const leaf = path[level][0]
    offset = leaf.offset += offset * 2
  }
  // Add txid leaf
  const b0 = path[0][0]
  const isLeft = (b0.offset & 1) === 0
  const leaf: Leaf = {
    offset: b0.offset + (isLeft ? -1 : 1),
    hash: proof.hash,
    txid: true,
  }
  if (isLeft)
    path[0].unshift(leaf);
  else
    path[0].push(leaf);
  return new MerklePath(blockHeight, path)
}
