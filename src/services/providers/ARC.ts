import {
  Beef,
  BEEF_V1,
  BEEF_V2,
  defaultHttpClient,
  HexString,
  HttpClient,
  HttpClientRequestOptions,
  Random,
  Utils
} from '@bsv/sdk'
import { doubleSha256BE, sdk } from '../../index.client'

/** Configuration options for the ARC broadcaster. */
export interface ArcConfig {
  /** Authentication token for the ARC API */
  apiKey?: string
  /** The HTTP client used to make requests to the ARC API. */
  httpClient?: HttpClient
  /** Deployment id used annotating api calls in XDeployment-ID header - this value will be randomly generated if not set */
  deploymentId?: string
  /** notification callback endpoint for proofs and double spend notification */
  callbackUrl?: string
  /** default access token for notification callback endpoint. It will be used as a Authorization header for the http callback */
  callbackToken?: string
  /** additional headers to be attached to all tx submissions. */
  headers?: Record<string, string>
}

function defaultDeploymentId(): string {
  return `ts-sdk-${Utils.toHex(Random(16))}`
}

/**
 * Represents an ARC transaction broadcaster.
 */
export default class ARC {
  readonly URL: string
  readonly apiKey: string | undefined
  readonly deploymentId: string
  readonly callbackUrl: string | undefined
  readonly callbackToken: string | undefined
  readonly headers: Record<string, string> | undefined
  private readonly httpClient: HttpClient

  /**
   * Constructs an instance of the ARC broadcaster.
   *
   * @param {string} URL - The URL endpoint for the ARC API.
   * @param {ArcConfig} config - Configuration options for the ARC broadcaster.
   */
  constructor(URL: string, config?: ArcConfig)
  /**
   * Constructs an instance of the ARC broadcaster.
   *
   * @param {string} URL - The URL endpoint for the ARC API.
   * @param {string} apiKey - The API key used for authorization with the ARC API.
   */
  constructor(URL: string, apiKey?: string)

  constructor(URL: string, config?: string | ArcConfig) {
    this.URL = URL
    if (typeof config === 'string') {
      this.apiKey = config
      this.httpClient = defaultHttpClient()
      this.deploymentId = defaultDeploymentId()
      this.callbackToken = undefined
      this.callbackUrl = undefined
    } else {
      const configObj: ArcConfig = config ?? {}
      const {
        apiKey,
        deploymentId,
        httpClient,
        callbackToken,
        callbackUrl,
        headers
      } = configObj
      this.apiKey = apiKey
      this.httpClient = httpClient ?? defaultHttpClient()
      this.deploymentId = deploymentId ?? defaultDeploymentId()
      this.callbackToken = callbackToken
      this.callbackUrl = callbackUrl
      this.headers = headers
    }
  }

  /**
   * Constructs a dictionary of the default & supplied request headers.
   */
  private requestHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'XDeployment-ID': this.deploymentId
    }

    if (this.apiKey != null && this.apiKey !== '') {
      headers.Authorization = `Bearer ${this.apiKey}`
    }

    if (this.callbackUrl != null && this.callbackUrl !== '') {
      headers['X-CallbackUrl'] = this.callbackUrl
    }

    if (this.callbackToken != null && this.callbackToken !== '') {
      headers['X-CallbackToken'] = this.callbackToken
    }

    if (this.headers != null) {
      for (const key in this.headers) {
        headers[key] = this.headers[key]
      }
    }

    return headers
  }

  /**
   * The ARC '/v1/tx' endpoint, as of 2025-02-17 supports all of the following hex string formats:
   *   1. Single serialized raw transaction.
   *   2. Single EF serialized raw transaction (untested).
   *   3. V1 serialized Beef (results returned reflect only the last transaction in the beef)
   *
   * The ARC '/v1/tx' endpoint, as of 2025-02-17 DOES NOT support the following hex string formats:
   *   1. V2 serialized Beef
   *
   * @param rawTx
   * @param txids
   * @returns
   */
  async postRawTx(
    rawTx: HexString,
    txids?: string[]
  ): Promise<sdk.PostTxResultForTxid> {
    let txid = Utils.toHex(doubleSha256BE(Utils.toArray(rawTx, 'hex')))
    if (txids) {
      txid = txids.slice(-1)[0]
    }

    const requestOptions: HttpClientRequestOptions = {
      method: 'POST',
      headers: this.requestHeaders(),
      data: { rawTx }
    }

    const r: sdk.PostTxResultForTxid = {
      txid,
      status: 'success'
    }

    try {
      const response = await this.httpClient.request<ArcResponse>(
        `${this.URL}/v1/tx`,
        requestOptions
      )

      if (response.ok) {
        const { txid, extraInfo, txStatus, competingTxs } = response.data
        r.data = `${txStatus} ${extraInfo}`
        if (r.txid !== txid) r.data += ` txid altered from ${r.txid} to ${txid}`
        r.txid = txid
        if (txStatus === 'DOUBLE_SPEND_ATTEMPTED') {
          r.status = 'error'
          r.doubleSpend = true
          r.competingTxs = competingTxs
        }
      } else {
        r.status = 'error'
        const ed: sdk.PostTxResultForTxidError = {}
        r.data = ed
        const st = typeof response.status
        ed.status =
          st === 'number' || st === 'string'
            ? response.status.toString()
            : 'ERR_UNKNOWN'

        let d = response.data
        if (d && typeof d === 'string') {
          try {
            d = JSON.parse(d)
          } catch {
            // Intentionally left empty
          }
        }
        if (d && typeof d === 'object') {
          ed.more = d
          ed.detail = d['detail']
          if (typeof ed.detail !== 'string') ed.detail = undefined
        }
      }
    } catch (eu: unknown) {
      const e = sdk.WalletError.fromUnknown(eu)
      r.status = 'error'
      r.data = `${e.code} ${e.message}`
    }

    return r
  }

  /**
   * ARC does not natively support a postBeef end-point aware of multiple txids of interest in the Beef.
   *
   * It does process multiple new transactions, however, which allows results for all txids of interest
   * to be collected by the `/v1/tx/${txid}` endpoint.
   *
   * @param beef
   * @param txids
   * @returns
   */
  async postBeef(beef: Beef, txids: string[]): Promise<sdk.PostBeefResult> {
    if (beef.version === BEEF_V2 && beef.txs.every(btx => !btx.isTxidOnly)) {
      beef.version = BEEF_V1
    }

    const beefHex = beef.toHex()

    const prtr = await this.postRawTx(beefHex, txids)

    const r: sdk.PostBeefResult = {
      name: 'ARC',
      status: prtr.status,
      txidResults: [prtr]
    }

    for (const txid of txids) {
      if (prtr.txid === txid) continue
      const tr: sdk.PostTxResultForTxid = {
        txid,
        status: 'success'
      }
      const dr = await this.getTxData(txid)
      if (dr.txid !== txid) {
        tr.status = 'error'
        tr.data = 'internal error'
      } else if (
        dr.txStatus === 'SEEN_ON_NETWORK' ||
        dr.txStatus === 'STORED'
      ) {
        tr.data = dr.txStatus
      } else {
        tr.status = 'error'
        tr.data = dr
      }
      r.txidResults.push(tr)
      if (r.status === 'success' && tr.status === 'error') r.status = 'error'
    }

    return r
  }

  /**
   * This seems to only work for recently submitted txids...but that's all we need to complete postBeef!
   * @param txid
   * @returns
   */
  async getTxData(txid: string): Promise<ArcMinerGetTxData> {
    const requestOptions: HttpClientRequestOptions = {
      method: 'GET',
      headers: this.requestHeaders()
    }

    const response = await this.httpClient.request<ArcMinerGetTxData>(
      `${this.URL}/v1/tx/${txid}`,
      requestOptions
    )

    return response.data
  }
}

interface ArcResponse {
  txid: string
  extraInfo: string
  txStatus: string
  competingTxs?: string[]
}

export interface ArcMinerGetTxData {
  status: number // 200
  title: string // OK
  blockHash: string
  blockHeight: number
  competingTxs: null | string[]
  extraInfo: string
  merklePath: string
  timestamp: string // ISO Z
  txid: string
  txStatus: string // 'SEEN_IN_ORPHAN_MEMPOOL'
}
