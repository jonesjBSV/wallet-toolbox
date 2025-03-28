import { AtomicBEEF, OutpointString, SendWithResult, TXIDHexString, WalletNetwork } from '@bsv/sdk'
import { WalletError } from './WalletError'
import { ReviewActionResult } from './WalletStorage.interfaces'

/**
 * Not implemented.
 */
export class WERR_NOT_IMPLEMENTED extends WalletError {
  constructor(message?: string) {
    super('WERR_NOT_IMPLEMENTED', message ?? 'Not implemented.')
  }
}

/**
 * An internal error has occurred.
 *
 * This is an example of an error with an optional custom `message`.
 */
export class WERR_INTERNAL extends WalletError {
  constructor(message?: string) {
    super('WERR_INTERNAL', message ?? 'An internal error has occurred.')
  }
}

/**
 * The ${parameter} parameter is invalid.
 *
 * This is an example of an error object with a custom property `parameter` and templated `message`.
 */
export class WERR_INVALID_OPERATION extends WalletError {
  constructor(message?: string) {
    super('WERR_INVALID_OPERATION', message ?? `An invalid operation was requested.`)
  }
}

/**
 * Unable to broadcast transaction at this time.
 */
export class WERR_BROADCAST_UNAVAILABLE extends WalletError {
  constructor(message?: string) {
    super('WERR_BROADCAST_UNAVAILABLE', `Unable to broadcast transaction at this time.`)
  }
}

/**
 * The ${parameter} parameter is invalid.
 *
 * This is an example of an error object with a custom property `parameter` and templated `message`.
 */
export class WERR_INVALID_PARAMETER extends WalletError {
  constructor(
    public parameter: string,
    mustBe?: string
  ) {
    super('WERR_INVALID_PARAMETER', `The ${parameter} parameter must be ${mustBe ?? 'valid.'}`)
  }
}

/**
 * The required ${parameter} parameter is missing.
 *
 * This is an example of an error object with a custom property `parameter`
 */
export class WERR_MISSING_PARAMETER extends WalletError {
  constructor(public parameter: string) {
    super('WERR_MISSING_PARAMETER', `The required ${parameter} parameter is missing.`)
  }
}

/**
 * The request is invalid.
 */
export class WERR_BAD_REQUEST extends WalletError {
  constructor(message?: string) {
    super('WERR_BAD_REQUEST', message ?? 'The request is invalid.')
  }
}

/**
 * Configured network chain is invalid or does not match across services.
 */
export class WERR_NETWORK_CHAIN extends WalletError {
  constructor(message?: string) {
    super('WERR_NETWORK_CHAIN', message ?? 'Configured network chain is invalid or does not match across services.')
  }
}

/**
 * Access is denied due to an authorization error.
 */
export class WERR_UNAUTHORIZED extends WalletError {
  constructor(message?: string) {
    super('WERR_UNAUTHORIZED', message ?? 'Access is denied due to an authorization error.')
  }
}

/**
 * WalletStorageManager is not accessing user's active storage or there are conflicting active stores configured.
 */
export class WERR_NOT_ACTIVE extends WalletError {
  constructor(message?: string) {
    super(
      'WERR_NOT_ACTIVE',
      message ??
        `WalletStorageManager is not accessing user's active storage or there are conflicting active stores configured.`
    )
  }
}

/**
 * Insufficient funds in the available inputs to cover the cost of the required outputs
 * and the transaction fee (${moreSatoshisNeeded} more satoshis are needed,
 * for a total of ${totalSatoshisNeeded}), plus whatever would be required in order
 * to pay the fee to unlock and spend the outputs used to provide the additional satoshis.
 */
export class WERR_INSUFFICIENT_FUNDS extends WalletError {
  /**
   * @param totalSatoshisNeeded Total satoshis required to fund transactions after net of required inputs and outputs.
   * @param moreSatoshisNeeded Shortfall on total satoshis required to fund transactions after net of required inputs and outputs.
   */
  constructor(
    public totalSatoshisNeeded: number,
    public moreSatoshisNeeded: number
  ) {
    super(
      'WERR_INSUFFICIENT_FUNDS',
      `Insufficient funds in the available inputs to cover the cost of the required outputs and the transaction fee (${moreSatoshisNeeded} more satoshis are needed, for a total of ${totalSatoshisNeeded}), plus whatever would be required in order to pay the fee to unlock and spend the outputs used to provide the additional satoshis.`
    )
  }
}

export class WERR_INVALID_PUBLIC_KEY extends WalletError {
  /**
   * @param key The invalid public key that caused the error.
   * @param environment Optional environment flag to control whether the key is included in the message.
   */
  constructor(
    public key: string,
    network: WalletNetwork = 'mainnet'
  ) {
    const message =
      network === 'mainnet'
        ? `The provided public key "${key}" is invalid or malformed.`
        : `The provided public key is invalid or malformed.`
    super('WERR_INVALID_PUBLIC_KEY', message)
  }
}

/**
 * When a `createAction` or `signAction` is completed in undelayed mode (`acceptDelayedBroadcast`: false),
 * any unsucccessful result will return the results by way of this exception to ensure attention is
 * paid to processing errors.
 */
export class WERR_REVIEW_ACTIONS extends WalletError {
  /**
   * All parameters correspond to their comparable `createAction` or `signSction` results
   * with the exception of `reviewActionResults`;
   * which contains more details, particularly for double spend results.
   */
  constructor(
    public reviewActionResults: ReviewActionResult[],
    public sendWithResults: SendWithResult[],
    public txid?: TXIDHexString,
    public tx?: AtomicBEEF,
    public noSendChange?: OutpointString[]
  ) {
    super('WERR_REVIEW_ACTIONS', 'Undelayed createAction or signAction results require review.')
  }
}
