import {
  BEEF,
  CreateActionArgs,
  CreateActionOptions,
  CreateActionOutput,
  CreateActionResult,
  KeyDeriver,
  P2PKH,
  PrivateKey,
  PublicKey,
  WalletInterface
} from '@bsv/sdk'
import {
  Monitor,
  sdk,
  Services,
  StorageClient,
  verifyTruthy,
  Wallet,
  WalletStorageManager
} from './index.client'

/**
 * The `SetupClient` class provides static setup functions to construct BRC-100 compatible
 * wallets in a variety of configurations.
 *
 * It serves as a starting point for experimentation and customization.
 *
 * `SetupClient` references only browser compatible code including storage via `StorageClient`.
 * `Setup` extends `SetupClient` adding database storage via `Knex` and `StorageKnex`.
 *
 */
export abstract class SetupClient {
  /**
   * Creates content for .env file with some private keys, identity keys, sample API keys, and sample MySQL connection string.
   *
   * Two new, random private keys are generated each time, with their associated public identity keys.
   *
   * Loading secrets from a .env file is intended only for experimentation and getting started.
   * Private keys should never be included directly in your source code.
   *
   * @publicbody
   */
  static makeEnv(): string {
    const testPrivKey1 = PrivateKey.fromRandom()
    const testIdentityKey1 = testPrivKey1.toPublicKey().toString()
    const testPrivKey2 = PrivateKey.fromRandom()
    const testIdentityKey2 = testPrivKey2.toPublicKey().toString()
    const mainPrivKey1 = PrivateKey.fromRandom()
    const mainIdentityKey1 = mainPrivKey1.toPublicKey().toString()
    const mainPrivKey2 = PrivateKey.fromRandom()
    const mainIdentityKey2 = mainPrivKey2.toPublicKey().toString()

    const log = `
    # Add the following to .env file:
    MAIN_TAAL_API_KEY='mainnet_9596de07e92300c6287e4393594ae39c'
    TEST_TAAL_API_KEY='testnet_0e6cf72133b43ea2d7861da2a38684e3'
    MY_TEST_IDENTITY = '${testIdentityKey1}'
    MY_TEST_IDENTITY2 = '${testIdentityKey2}'
    MY_MAIN_IDENTITY = '${mainIdentityKey1}'
    MY_MAIN_IDENTITY2 = '${mainIdentityKey2}'
    DEV_KEYS = '{
        "${testIdentityKey1}": "${testPrivKey1.toString()}",
        "${testIdentityKey2}": "${testPrivKey2.toString()}"
        "${mainIdentityKey1}": "${mainPrivKey1.toString()}",
        "${mainIdentityKey2}": "${mainPrivKey2.toString()}"
    }'
    MYSQL_CONNECTION='{"port":3306,"host":"127.0.0.1","user":"root","password":"<your_password>","database":"<your_database>", "timezone": "Z"}'
    `
    console.log(log)

    return log
  }

  /**
   * Reads a .env file of the format created by `makeEnv`.
   *
   * Returns values for designated `chain`.
   *
   * Access private keys through the `devKeys` object: `devKeys[identityKey]`
   *
   * @param chain Which chain to use: 'test' or 'main'
   * @returns {SetupEnv} with configuration environment secrets used by `Setup` functions.
   *
   * @publicbody
   */
  static getEnv(chain: sdk.Chain): SetupEnv {
    // Identity keys of the lead maintainer of this repo...
    const identityKey =
      chain === 'main'
        ? process.env.MY_MAIN_IDENTITY
        : process.env.MY_TEST_IDENTITY
    const identityKey2 =
      chain === 'main'
        ? process.env.MY_MAIN_IDENTITY2
        : process.env.MY_TEST_IDENTITY2
    const DEV_KEYS = process.env.DEV_KEYS || '{}'
    const mySQLConnection = process.env.MYSQL_CONNECTION || '{}'
    const taalApiKey = verifyTruthy(
      chain === 'main'
        ? process.env.MAIN_TAAL_API_KEY
        : process.env.TEST_TAAL_API_KEY,
      `.env value for '${chain.toUpperCase()}_TAAL_API_KEY' is required.`
    )

    if (!identityKey || !identityKey2)
      throw new sdk.WERR_INVALID_OPERATION(
        '.env is not a valid SetupEnv configuration.'
      )

    return {
      chain,
      identityKey,
      identityKey2,
      taalApiKey,
      devKeys: JSON.parse(DEV_KEYS) as Record<string, string>,
      mySQLConnection
    }
  }

  /**
   * Create a `Wallet`. Storage can optionally be provided or configured later.
   *
   * The following components are configured: KeyDeriver, WalletStorageManager, WalletService, WalletStorage.
   * Optionally, PrivilegedKeyManager is also configured.
   *
   * @publicbody
   */
  static async createWallet(args: SetupWalletArgs): Promise<SetupWallet> {
    const chain = args.env.chain
    args.rootKeyHex ||= args.env.devKeys[args.env.identityKey]
    const rootKey = PrivateKey.fromHex(args.rootKeyHex)
    const identityKey = rootKey.toPublicKey().toString()
    const keyDeriver = new KeyDeriver(rootKey)
    const storage = new WalletStorageManager(
      identityKey,
      args.active,
      args.backups
    )
    if (storage.stores.length > 0) await storage.makeAvailable()
    const serviceOptions = Services.createDefaultOptions(chain)
    serviceOptions.taalApiKey = args.env.taalApiKey
    const services = new Services(chain)
    const monopts = Monitor.createDefaultWalletMonitorOptions(
      chain,
      storage,
      services
    )
    const monitor = new Monitor(monopts)
    monitor.addDefaultTasks()
    let privilegedKeyManager: sdk.PrivilegedKeyManager | undefined = undefined
    if (args.privKeyHex) {
      const privKey = PrivateKey.fromString(args.privKeyHex)
      privilegedKeyManager = new sdk.PrivilegedKeyManager(async () => privKey)
    }
    const wallet = new Wallet({
      chain,
      keyDeriver,
      storage,
      services,
      monitor,
      privilegedKeyManager
    })
    const r: SetupWallet = {
      rootKey,
      identityKey,
      keyDeriver,
      chain,
      storage,
      services,
      monitor,
      wallet
    }
    return r
  }

  /**
   * @publicbody
   */
  static async createWalletClient(
    args: SetupWalletClientArgs
  ): Promise<SetupWalletClient> {
    const wo = await SetupClient.createWallet(args)
    if (wo.chain === 'main')
      throw new sdk.WERR_INVALID_PARAMETER(
        'chain',
        `'test' for now, 'main' is not yet supported.`
      )

    const endpointUrl =
      args.endpointUrl || 'https://staging-dojo.babbage.systems'
    const client = new StorageClient(wo.wallet, endpointUrl)
    await wo.storage.addWalletStorageProvider(client)
    await wo.storage.makeAvailable()
    return {
      ...wo,
      endpointUrl
    }
  }

  /**
   * @publicbody
   */
  static getKeyPair(priv?: string | PrivateKey): KeyPairAddress {
    if (priv === undefined) priv = PrivateKey.fromRandom()
    else if (typeof priv === 'string') priv = new PrivateKey(priv, 'hex')

    const pub = PublicKey.fromPrivateKey(priv)
    const address = pub.toAddress()
    return { privateKey: priv, publicKey: pub, address }
  }

  /**
   * @publicbody
   */
  static getLockP2PKH(address: string) {
    const p2pkh = new P2PKH()
    const lock = p2pkh.lock(address)
    return lock
  }

  /**
   * @publicbody
   */
  static getUnlockP2PKH(
    priv: PrivateKey,
    satoshis: number
  ): sdk.ScriptTemplateUnlock {
    const p2pkh = new P2PKH()
    const lock = SetupClient.getLockP2PKH(SetupClient.getKeyPair(priv).address)
    // Prepare to pay with SIGHASH_ALL and without ANYONE_CAN_PAY.
    // In otherwords:
    // - all outputs must remain in the current order, amount and locking scripts.
    // - all inputs must remain from the current outpoints and sequence numbers.
    // (unlock scripts are never signed)
    const unlock = p2pkh.unlock(priv, 'all', false, satoshis, lock)
    return unlock
  }

  /**
   * @publicbody
   */
  static createP2PKHOutputs(
    outputs: {
      address: string
      satoshis: number
      outputDescription?: string
      basket?: string
      tags?: string[]
    }[]
  ): CreateActionOutput[] {
    const os: CreateActionOutput[] = []
    const count = outputs.length
    for (let i = 0; i < count; i++) {
      const o = outputs[i]
      os.push({
        basket: o.basket,
        tags: o.tags,
        satoshis: o.satoshis,
        lockingScript: SetupClient.getLockP2PKH(o.address).toHex(),
        outputDescription: o.outputDescription || `p2pkh ${i}`
      })
    }
    return os
  }

  /**
   * @publicbody
   */
  static async createP2PKHOutputsAction(
    wallet: WalletInterface,
    outputs: {
      address: string
      satoshis: number
      outputDescription?: string
      basket?: string
      tags?: string[]
    }[],
    options?: CreateActionOptions
  ): Promise<{
    cr: CreateActionResult
    outpoints: string[] | undefined
  }> {
    const os = SetupClient.createP2PKHOutputs(outputs)

    const createArgs: CreateActionArgs = {
      description: `createP2PKHOutputs`,
      outputs: os,
      options: {
        ...options,
        // Don't randomize so we can simplify outpoint creation
        randomizeOutputs: false
      }
    }

    const cr = await wallet.createAction(createArgs)

    let outpoints: string[] | undefined

    if (cr.txid) {
      outpoints = os.map((o, i) => `${cr.txid}.${i}`)
    }

    return { cr, outpoints }
  }

  /**
   * @publicbody
   */
  static async fundWalletFromP2PKHOutpoints(
    wallet: WalletInterface,
    outpoints: string[],
    p2pkhKey: KeyPairAddress,
    inputBEEF?: BEEF
  ) {
    // TODO
  }
}

/**
 * A private key and associated public key and address.
 */
export interface KeyPairAddress {
  privateKey: PrivateKey
  publicKey: PublicKey
  address: string
}

/**
 * `SetupEnv` provides a starting point for managing secrets that
 * must not appear in source code.
 *
 * The `makeEnv` and `getEnv` functions of the `Setup` and `SetupClient` classes
 * provide an easy way to create and import these secrets and related properties.
 */
export interface SetupEnv {
  /**
   * The chan being accessed: 'main' for mainnet, 'test' for 'testnet'.
   */
  chain: sdk.Chain
  /**
   * The user's primary identity key (public key).
   */
  identityKey: string
  /**
   * A secondary identity key (public key), used to test exchanges with other users.
   */
  identityKey2: string
  /**
   * A vaild TAAL API key for use by `Services`
   */
  taalApiKey: string
  /**
   * A map of public keys (identity keys, hex strings) to private keys (hex strings).
   */
  devKeys: Record<string, string>
  /**
   * A MySQL connection string including user and password properties.
   * Must be valid to make use of MySQL `Setup` class support.
   */
  mySQLConnection: string
}

/**
 * Arguments used by `createWallet` to construct a `SetupWallet`.
 *
 * Extension `SetupWalletClientArgs` used by `createWalletClient` to construct a `SetupWalletClient`.
 *
 * Extension `SetupWalletKnexArgs` used by `createWalletKnex` to construct a `SetupWalletKnex`.
 *
 * Extension `SetupWalletMySQLArgs` used by `createWalletMySQL` to construct a `SetupWalletKnex`.
 *
 * Extension `SetupWalletSQLiteArgs` used by `createWalletSQLite` to construct a `SetupWalletKnex`.
 */
export interface SetupWalletArgs {
  /**
   * Configuration "secrets" typically obtained by `Setup.makeEnv` and `Setup.getEnv` functions.
   */
  env: SetupEnv
  /**
   * Optional. The non-privileged private key used to initialize the `KeyDeriver` and determine the `identityKey`.
   * Defaults to `env.devKeys[env.identityKey]
   */
  rootKeyHex?: string
  /**
   * Optional. The privileged private key used to initialize the `PrivilegedKeyManager`.
   * Defaults to undefined.
   */
  privKeyHex?: string
  /**
   * Optional. Active wallet storage. Can be added later.
   */
  active?: sdk.WalletStorageProvider
  /**
   * Optional. One or more storage providers managed as backup destinations. Can be added later.
   */
  backups?: sdk.WalletStorageProvider[]
}

/**
 * When creating a BRC-100 compatible `Wallet`, many components come into play.
 *
 * All of the `createWallet` functions in the `Setup` and `SetupClient` classes return
 * an object with direct access to each component to facilitate experimentation, testing
 * and customization.
 */
export interface SetupWallet {
  /**
   * The rootKey of the `KeyDeriver`. The private key from which other keys are derived.
   */
  rootKey: PrivateKey
  /**
   * The pubilc key associated with the `rootKey` which also serves as the wallet's identity.
   */
  identityKey: string
  /**
   * The `KeyDeriver` component used by the wallet for key derivation and cryptographic functions.
   */
  keyDeriver: KeyDeriver
  /**
   * The chain ('main' or 'test') which the wallet accesses.
   */
  chain: sdk.Chain
  /**
   * The `WalletStorageManager` that manages all the configured storage providers (active and backups)
   * accessed by the wallet.
   */
  storage: WalletStorageManager
  /**
   * The network `Services` component which provides the wallet with access to external services hosted
   * on the public network.
   */
  services: Services
  /**
   * The background task `Monitor` component available to the wallet to offload tasks
   * that speed up wallet operations and maintain data integrity.
   */
  monitor: Monitor
  /**
   * The actual BRC-100 `Wallet` to which all the other properties and components contribute.
   *
   * Note that internally, the wallet is itself linked to all these properties and components.
   * They are included in this interface to facilitate access after wallet construction for
   * experimentation, testing and customization. Any changes made to the configuration of these
   * components after construction may disrupt the normal operation of the wallet.
   */
  wallet: Wallet
}

/**
 * Extension `SetupWalletClientArgs` of `SetupWalletArgs` is used by `createWalletClient`
 * to construct a `SetupWalletClient`.
 */
export interface SetupWalletClientArgs extends SetupWalletArgs {
  /**
   * The endpoint URL of a service hosting the `StorageServer` JSON-RPC service to
   * which a `StorageClient` instance should connect to function as
   * the active storage provider of the newly created wallet.
   */
  endpointUrl?: string
}

/**
 * Extension `SetupWalletClient` of `SetupWallet` is returned by `createWalletClient`
 */
export interface SetupWalletClient extends SetupWallet {
  /**
   * The endpoint URL of the service hosting the `StorageServer` JSON-RPC service to
   * which a `StorageClient` instance is connected to function as
   * the active storage provider of the wallet.
   */
  endpointUrl: string
}
