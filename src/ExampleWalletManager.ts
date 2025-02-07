import {
  OriginatorDomainNameStringUnder250Bytes,
  Utils,
  WalletInterface,
  RPuzzle,
  PrivateKey,
  ProtoWallet,
  BigNumber,
  Random,
  Transaction
} from '@bsv/sdk'
import {
  CWIStyleWalletManager,
  OverlayUMPTokenInteractor,
  UMPTokenInteractor
} from './CWIStyleWalletManager'
import { PrivilegedKeyManager } from './sdk/PrivilegedKeyManager'

export class ExampleWalletManager extends CWIStyleWalletManager {
  secretServerURL: string

  constructor(
    adminOriginator: OriginatorDomainNameStringUnder250Bytes,
    walletBuilder: (
      primaryKey: number[],
      privilegedKeyManager: PrivilegedKeyManager
    ) => Promise<WalletInterface>,
    interactor: UMPTokenInteractor = new OverlayUMPTokenInteractor(),
    recoveryKeySaver: (key: number[]) => Promise<true>,
    passwordRetriever: (
      reason: string,
      test: (passwordCandidate: string) => boolean
    ) => Promise<string>,
    secretServerURL: string,
    stateSnapshot?: number[]
  ) {
    super(
      adminOriginator,
      walletBuilder,
      interactor,
      recoveryKeySaver,
      passwordRetriever,
      // Here, we provide a custom new wallet funder that uses the Secret Server
      async (
        presentationKey: number[],
        wallet: WalletInterface,
        adminOriginator: string
      ) => {
        // const faucetResult = await fetch(`${this.secretServerURL}/faucet`, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json'
        //   },
        //   body: JSON.stringify({ secret: Utils.toHex(presentationKey) })
        // })
        // const faucetResultJSON = await faucetResult.json()
        // if (!faucetResultJSON.k || !faucetResultJSON.tx) {
        //   throw new Error('Invalid')
        // }
        // const faucetTx = Transaction.fromBinary(faucetResultJSON.tx)
        // const faucetRedeemTXCreationResult = await wallet.createAction(
        //   {
        //     inputBEEF: faucetTx.toBEEF(),
        //     inputs: [
        //       {
        //         outpoint: `${faucetTx.id('hex')}.0`,
        //         unlockingScriptLength: 104,
        //         inputDescription: 'Fund from faucet'
        //       }
        //     ],
        //     description: 'Fund wallet'
        //   },
        //   adminOriginator
        // )
        // const faucetRedeemTX = Transaction.fromAtomicBEEF(
        //   faucetRedeemTXCreationResult.signableTransaction!.tx
        // )
        // const faucetRedemptionPuzzle = new RPuzzle()
        // const randomRedemptionPrivateKey = PrivateKey.fromRandom()
        // const faucetRedeemUnlocker = faucetRedemptionPuzzle.unlock(
        //   new BigNumber(faucetResultJSON.k, 16),
        //   randomRedemptionPrivateKey
        // )
        // const faucetRedeemUnlockingScript = await faucetRedeemUnlocker.sign(
        //   faucetRedeemTX,
        //   0
        // )
        // await wallet.signAction({
        //   reference:
        //     faucetRedeemTXCreationResult.signableTransaction!.reference,
        //   spends: {
        //     0: {
        //       unlockingScript: faucetRedeemUnlockingScript.toHex()
        //     }
        //   }
        // })
      },
      stateSnapshot
    )
    this.secretServerURL = secretServerURL
  }
  async providePhoneNumber(E164: string): Promise<void> {
    // Generate a presentation key for this user in case none exists.
    // In case it exists, the actual one will be returned. Otherwise the server stores this one new.
    // const presentationKey = Random(32)
    // const phoneSubmissionResult = await fetch(
    //   `${this.secretServerURL}/sendcode`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({
    //       E164,
    //       secret: Utils.toHex(presentationKey)
    //     })
    //   }
    // )
    // const phoneSubmissionResultJSON = await phoneSubmissionResult.json()
    // if (!phoneSubmissionResultJSON.message) {
    //   throw new Error('Invalid')
    // }
  }
  async provideCode(code: string): Promise<void> {
    // const codeSubmissionResult = await fetch(
    //   `${this.secretServerURL}/getsecret`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({ code })
    //   }
    // )
    // const codeSubmissionResultJSON = await codeSubmissionResult.json()
    // if (!codeSubmissionResultJSON.secret) {
    //   throw new Error('Invalid')
    // }
    // return await this.providePresentationKey(
    //   Utils.toArray(codeSubmissionResultJSON.secret, 'hex')
    // )
    return await this.providePresentationKey(Random(32))
  }
}
