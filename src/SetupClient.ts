import { Beef, CreateActionArgs, CreateActionOutput, CreateActionResult, KeyDeriver, P2PKH, PrivateKey, PublicKey, SignActionArgs, SignActionResult, WalletInterface } from "@bsv/sdk"
import { Monitor, sdk, Services, StorageClient, verifyTruthy, Wallet, WalletStorageManager } from "./index.client"
import { PrivilegedKeyManager } from "./sdk"

/**
 * This class provides static setup functions to construct BRC-100 compatible
 * wallets in a variety of configurations.
 * 
 * It serves as a starting point for experimentation and customization.
 * 
 */
export abstract class SetupClient {
    static makeEnv(chain: sdk.Chain): void {

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
    }

    static getEnv(chain: sdk.Chain) {
        // Identity keys of the lead maintainer of this repo...
        const mainTaalApiKey = verifyTruthy(
            process.env.MAIN_TAAL_API_KEY || '',
            `.env value for 'mainTaalApiKey' is required.`
        )
        const testTaalApiKey = verifyTruthy(
            process.env.TEST_TAAL_API_KEY || '',
            `.env value for 'testTaalApiKey' is required.`
        )
        const identityKey =
            (chain === 'main'
                ? process.env.MY_MAIN_IDENTITY
                : process.env.MY_TEST_IDENTITY)
        const identityKey2 =
            (chain === 'main'
                ? process.env.MY_MAIN_IDENTITY2
                : process.env.MY_TEST_IDENTITY2)
        const DEV_KEYS = process.env.DEV_KEYS || '{}'
        const mySQLConnection = process.env.MYSQL_CONNECTION || '{}'

        return {
            chain,
            identityKey,
            identityKey2,
            mainTaalApiKey,
            testTaalApiKey,
            devKeys: JSON.parse(DEV_KEYS) as Record<string, string>,
            mySQLConnection
        }
    }

    static async createNoSendP2PKHOutpoint(
        basket: string,
        address: string,
        satoshis: number,
        noSendChange: string[] | undefined,
        wallet: WalletInterface
    ): Promise<{
        noSendChange: string[]
        txid: string
        cr: CreateActionResult
        sr: SignActionResult
    }> {
        return await SetupClient.createNoSendP2PKHOutpoints(
            1,
            basket,
            address,
            satoshis,
            noSendChange,
            wallet
        )
    }

    static async createNoSendP2PKHOutpoints(
        count: number,
        basket: string,
        address: string,
        satoshis: number,
        noSendChange: string[] | undefined,
        wallet: WalletInterface
    ): Promise<{
        noSendChange: string[]
        txid: string
        cr: CreateActionResult
        sr: SignActionResult
    }> {
        const outputs: CreateActionOutput[] = []
        for (let i = 0; i < count; i++) {
            outputs.push({
                basket,
                satoshis,
                lockingScript: SetupClient.getLockP2PKH(address).toHex(),
                outputDescription: `p2pkh ${i}`
            })
        }

        const createArgs: CreateActionArgs = {
            description: `to ${address}`,
            outputs,
            options: {
                noSendChange,
                randomizeOutputs: false,
                signAndProcess: false,
                noSend: true
            }
        }

        const cr = await wallet.createAction(createArgs)
        noSendChange = cr.noSendChange

        const st = cr.signableTransaction!
        // const tx = Transaction.fromAtomicBEEF(st.tx) // Transaction doesn't support V2 Beef yet.
        const beef = Beef.fromBinary(st.tx)
        const btx = beef.txs.slice(-1)[0]
        const tx = beef.findAtomicTransaction(btx.txid)

        // sign and complete
        const signArgs: SignActionArgs = {
            reference: st.reference,
            spends: {},
            options: {
                returnTXIDOnly: true,
                noSend: true
            }
        }

        const sr = await wallet.signAction(signArgs)

        let txid = sr.txid!
        // Update the noSendChange txid to final signed value.
        noSendChange = noSendChange!.map(op => `${txid}.${op.split('.')[1]}`)
        return { noSendChange, txid, cr, sr }
    }

    static getKeyPair(priv?: string | PrivateKey): KeyPairAddress {
        if (priv === undefined) priv = PrivateKey.fromRandom()
        else if (typeof priv === 'string') priv = new PrivateKey(priv, 'hex')

        const pub = PublicKey.fromPrivateKey(priv)
        const address = pub.toAddress()
        return { privateKey: priv, publicKey: pub, address }
    }

    static getLockP2PKH(address: string) {
        const p2pkh = new P2PKH()
        const lock = p2pkh.lock(address)
        return lock
    }

    static getUnlockP2PKH(priv: PrivateKey, satoshis: number) {
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

    static async createWalletOnly(args: {
        chain?: sdk.Chain
        rootKeyHex?: string
        active?: sdk.WalletStorageProvider
        backups?: sdk.WalletStorageProvider[]
        privKeyHex?: string
    }): Promise<SetupWalletOnly> {
        args.chain ||= 'test'
        args.rootKeyHex ||= '1'.repeat(64)
        const rootKey = PrivateKey.fromHex(args.rootKeyHex)
        const identityKey = rootKey.toPublicKey().toString()
        const keyDeriver = new KeyDeriver(rootKey)
        const chain = args.chain
        const storage = new WalletStorageManager(
            identityKey,
            args.active,
            args.backups
        )
        if (storage.stores.length > 0) await storage.makeAvailable()
        const services = new Services(args.chain)
        const monopts = Monitor.createDefaultWalletMonitorOptions(
            chain,
            storage,
            services
        )
        const monitor = new Monitor(monopts)
        monitor.addDefaultTasks()
        let privilegedKeyManager: PrivilegedKeyManager | undefined = undefined
        if (args.privKeyHex) {
            const privKey = PrivateKey.fromString(args.privKeyHex)
            privilegedKeyManager = new PrivilegedKeyManager(async () => privKey)
        }
        const wallet = new Wallet({
            chain,
            keyDeriver,
            storage,
            services,
            monitor,
            privilegedKeyManager
        })
        const r: SetupWalletOnly = {
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

    static async createWalletWithStorageClient(args: {
        rootKeyHex?: string
        endpointUrl?: string
        chain?: sdk.Chain
    }): Promise<SetupWalletOnly> {
        if (args.chain === 'main')
            throw new sdk.WERR_INVALID_PARAMETER(
                'chain',
                `'test' for now, 'main' is not yet supported.`
            )

        const wo = await SetupClient.createWalletOnly({
            chain: 'test',
            rootKeyHex: args.rootKeyHex
        })
        args.endpointUrl ||= 'https://staging-dojo.babbage.systems'
        const client = new StorageClient(wo.wallet, args.endpointUrl)
        await wo.storage.addWalletStorageProvider(client)
        await wo.storage.makeAvailable()
        return wo
    }

}

export type KeyPairAddress = {
  privateKey: PrivateKey
  publicKey: PublicKey
  address: string
}

export interface SetupWalletOnly {
  rootKey: PrivateKey
  identityKey: string
  keyDeriver: KeyDeriver
  chain: sdk.Chain
  storage: WalletStorageManager
  services: Services
  monitor: Monitor
  wallet: Wallet
}
