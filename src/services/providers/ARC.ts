import { Broadcaster, BroadcastFailure, BroadcastResponse, defaultHttpClient, HexString, HttpClient, HttpClientRequestOptions, Random, Transaction, Utils } from "@bsv/sdk"
import { doubleSha256BE, sdk } from "../../index.client"
import { error } from "console"

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

  async postRawTx(rawTx: HexString): Promise<sdk.PostTxResultForTxid> {

    const txid = Utils.toHex(doubleSha256BE(Utils.toArray(rawTx, 'hex')))

    const requestOptions: HttpClientRequestOptions = {
      method: 'POST',
      headers: this.requestHeaders(),
      data: { rawTx }
    }

    const r: sdk.PostTxResultForTxid = {
      txid,
      status: "success"
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
        ed.status = st === 'number' || st === 'string' ? response.status.toString() : 'ERR_UNKNOWN'

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
   * Broadcasts multiple transactions via ARC.
   * Handles mixed responses where some transactions succeed and others fail.
   *
   * @param {Transaction[]} txs - Array of transactions to be broadcasted.
   * @returns {Promise<Array<object>>} A promise that resolves to an array of objects.
   */
  async broadcastMany(txs: Transaction[]): Promise<object[]> {
    const rawTxs = txs.map((tx) => {
      try {
        return { rawTx: tx.toHexEF() }
    } catch (eu: unknown) {
        const e = sdk.WalletError.fromUnknown(eu)
        if (
          e.message ===
          'All inputs must have source transactions when serializing to EF format'
        ) {
          return { rawTx: tx.toHex() }
        }
        throw eu
      }
    })

    const requestOptions: HttpClientRequestOptions = {
      method: 'POST',
      headers: this.requestHeaders(),
      data: rawTxs
    }

    try {
      const response = await this.httpClient.request<object[]>(
        `${this.URL}/v1/txs`,
        requestOptions
      )

      return response.data as object[]
    } catch (eu: unknown) {
        const e = sdk.WalletError.fromUnknown(eu)
      const errorResponse: BroadcastFailure = {
        status: 'error',
        code: '500',
        description: typeof e.message === 'string' ? e.message : 'Internal Server Error'
      }
      return txs.map(() => errorResponse)
    }
  }
}

interface ArcResponse {
  txid: string
  extraInfo: string
  txStatus: string
  competingTxs?: string[]
}
