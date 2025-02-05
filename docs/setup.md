# API

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

## Interfaces

| |
| --- |
| [SetupEnv](#interface-setupenv) |
| [SetupWallet](#interface-setupwallet) |
| [SetupWalletArgs](#interface-setupwalletargs) |
| [SetupWalletClient](#interface-setupwalletclient) |
| [SetupWalletClientArgs](#interface-setupwalletclientargs) |
| [SetupWalletKnex](#interface-setupwalletknex) |
| [SetupWalletKnexArgs](#interface-setupwalletknexargs) |
| [SetupWalletMySQLArgs](#interface-setupwalletmysqlargs) |
| [SetupWalletSQLiteArgs](#interface-setupwalletsqliteargs) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

### Interface: SetupEnv

```ts
export interface SetupEnv {
    chain: sdk.Chain;
    identityKey: string;
    identityKey2: string;
    taalApiKey: string;
    devKeys: Record<string, string>;
    mySQLConnection: string;
}
```

See also: [Chain](#type-chain)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWallet

```ts
export interface SetupWallet {
    rootKey: PrivateKey;
    identityKey: string;
    keyDeriver: KeyDeriver;
    chain: sdk.Chain;
    storage: WalletStorageManager;
    services: Services;
    monitor: Monitor;
    wallet: Wallet;
}
```

See also: [Chain](#type-chain), [Monitor](#class-monitor), [Services](#class-services), [Wallet](#class-wallet), [WalletStorageManager](#class-walletstoragemanager)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletArgs

Arguments used to construct a `Wallet`

```ts
export interface SetupWalletArgs {
    env: SetupEnv;
    chain?: sdk.Chain;
    rootKeyHex?: string;
    privKeyHex?: string;
    active?: sdk.WalletStorageProvider;
    backups?: sdk.WalletStorageProvider[];
}
```

See also: [Chain](#type-chain), [SetupEnv](#interface-setupenv), [WalletStorageProvider](#interface-walletstorageprovider)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletClient

```ts
export interface SetupWalletClient extends SetupWallet {
    endpointUrl: string;
}
```

See also: [SetupWallet](#interface-setupwallet)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletClientArgs

```ts
export interface SetupWalletClientArgs extends SetupWalletArgs {
    endpointUrl?: string;
}
```

See also: [SetupWalletArgs](#interface-setupwalletargs)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletKnex

```ts
export interface SetupWalletKnex extends SetupWallet {
    activeStorage: StorageKnex;
    userId: number;
    rootKey: PrivateKey;
    identityKey: string;
    keyDeriver: KeyDeriver;
    chain: sdk.Chain;
    storage: WalletStorageManager;
    services: Services;
    monitor: Monitor;
    wallet: Wallet;
}
```

See also: [Chain](#type-chain), [Monitor](#class-monitor), [Services](#class-services), [SetupWallet](#interface-setupwallet), [StorageKnex](#class-storageknex), [Wallet](#class-wallet), [WalletStorageManager](#class-walletstoragemanager)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletKnexArgs

```ts
export interface SetupWalletKnexArgs extends SetupWalletArgs {
    knex: Knex<any, any[]>;
    databaseName: string;
}
```

See also: [SetupWalletArgs](#interface-setupwalletargs)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletMySQLArgs

```ts
export interface SetupWalletMySQLArgs extends SetupWalletArgs {
    databaseName: string;
}
```

See also: [SetupWalletArgs](#interface-setupwalletargs)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletSQLiteArgs

```ts
export interface SetupWalletSQLiteArgs extends SetupWalletArgs {
    filePath: string;
    databaseName: string;
}
```

See also: [SetupWalletArgs](#interface-setupwalletargs)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
## Classes

| |
| --- |
| [Setup](#class-setup) |
| [SetupClient](#class-setupclient) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

### Class: Setup

The 'Setup` class provides static setup functions to construct BRC-100 compatible
wallets in a variety of configurations.

It serves as a starting point for experimentation and customization.

`SetupClient` references only browser compatible code including storage via `StorageClient`.
`Setup` extends `SetupClient` adding database storage via `Knex` and `StorageKnex`.

```ts
export abstract class Setup extends SetupClient {
    static async createKnexWallet(args: SetupWalletKnexArgs): Promise<SetupWalletKnex> {
        const wo = await Setup.createWallet(args);
        const activeStorage = new StorageKnex({
            chain: wo.chain,
            knex: args.knex,
            commissionSatoshis: 0,
            commissionPubKeyHex: undefined,
            feeModel: { model: "sat/kb", value: 1 }
        });
        await activeStorage.migrate(args.databaseName, wo.identityKey);
        await activeStorage.makeAvailable();
        await wo.storage.addWalletStorageProvider(activeStorage);
        const { user, isNew } = await activeStorage.findOrInsertUser(wo.identityKey);
        const userId = user.userId;
        const r: SetupWalletKnex = {
            ...wo,
            activeStorage,
            userId
        };
        return r;
    }
    static createSQLiteKnex(filename: string): Knex {
        const config: Knex.Config = {
            client: "sqlite3",
            connection: { filename },
            useNullAsDefault: true
        };
        const knex = makeKnex(config);
        return knex;
    }
    static createMySQLKnex(connection: string, database?: string): Knex {
        const c: Knex.MySql2ConnectionConfig = JSON.parse(connection);
        if (database) {
            c.database = database;
        }
        const config: Knex.Config = {
            client: "mysql2",
            connection: c,
            useNullAsDefault: true,
            pool: { min: 0, max: 7, idleTimeoutMillis: 15000 }
        };
        const knex = makeKnex(config);
        return knex;
    }
    static async createMySQLWallet(args: SetupWalletMySQLArgs): Promise<SetupWalletKnex> {
        return await this.createKnexWallet({
            ...args,
            knex: Setup.createMySQLKnex(args.env.mySQLConnection, args.databaseName)
        });
    }
    static async createSQLiteWallet(args: SetupWalletSQLiteArgs): Promise<SetupWalletKnex> {
        return await this.createKnexWallet({
            ...args,
            knex: Setup.createSQLiteKnex(args.filePath)
        });
    }
}
```

See also: [SetupClient](#class-setupclient), [SetupWalletKnex](#interface-setupwalletknex), [SetupWalletKnexArgs](#interface-setupwalletknexargs), [SetupWalletMySQLArgs](#interface-setupwalletmysqlargs), [SetupWalletSQLiteArgs](#interface-setupwalletsqliteargs), [StorageKnex](#class-storageknex)

<details>

<summary>Class Setup Details</summary>

#### Method createKnexWallet

Adds `Knex` based storage to a `Wallet` configured by `Setup.createWalletOnly`

```ts
static async createKnexWallet(args: SetupWalletKnexArgs): Promise<SetupWalletKnex> {
    const wo = await Setup.createWallet(args);
    const activeStorage = new StorageKnex({
        chain: wo.chain,
        knex: args.knex,
        commissionSatoshis: 0,
        commissionPubKeyHex: undefined,
        feeModel: { model: "sat/kb", value: 1 }
    });
    await activeStorage.migrate(args.databaseName, wo.identityKey);
    await activeStorage.makeAvailable();
    await wo.storage.addWalletStorageProvider(activeStorage);
    const { user, isNew } = await activeStorage.findOrInsertUser(wo.identityKey);
    const userId = user.userId;
    const r: SetupWalletKnex = {
        ...wo,
        activeStorage,
        userId
    };
    return r;
}
```
See also: [Setup](#class-setup), [SetupWalletKnex](#interface-setupwalletknex), [SetupWalletKnexArgs](#interface-setupwalletknexargs), [StorageKnex](#class-storageknex)

Argument Details

+ **args.knex**
  + `Knex` object configured for either MySQL or SQLite database access.
Schema will be created and migrated as needed.
For MySQL, a schema corresponding to databaseName must exist with full access permissions.
+ **args.databaseName**
  + Name for this storage. For MySQL, the schema name within the MySQL instance.
+ **args.chain**
  + Which chain this wallet is on: 'main' or 'test'. Defaults to 'test'.

</details>

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Class: SetupClient

The `SetupClient` class provides static setup functions to construct BRC-100 compatible
wallets in a variety of configurations.

It serves as a starting point for experimentation and customization.

`SetupClient` references only browser compatible code including storage via `StorageClient`.
`Setup` extends `SetupClient` adding database storage via `Knex` and `StorageKnex`.

```ts
export abstract class SetupClient {
    static makeEnv(): string {
        const testPrivKey1 = PrivateKey.fromRandom();
        const testIdentityKey1 = testPrivKey1.toPublicKey().toString();
        const testPrivKey2 = PrivateKey.fromRandom();
        const testIdentityKey2 = testPrivKey2.toPublicKey().toString();
        const mainPrivKey1 = PrivateKey.fromRandom();
        const mainIdentityKey1 = mainPrivKey1.toPublicKey().toString();
        const mainPrivKey2 = PrivateKey.fromRandom();
        const mainIdentityKey2 = mainPrivKey2.toPublicKey().toString();
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
    `;
        console.log(log);
        return log;
    }
    static getEnv(chain: sdk.Chain): SetupEnv 
    static async createWallet(args: SetupWalletArgs): Promise<SetupWallet> {
        args.chain ||= args.env.chain;
        args.rootKeyHex ||= args.env.devKeys[args.env.identityKey];
        const rootKey = PrivateKey.fromHex(args.rootKeyHex);
        const identityKey = rootKey.toPublicKey().toString();
        const keyDeriver = new KeyDeriver(rootKey);
        const chain = args.chain;
        const storage = new WalletStorageManager(identityKey, args.active, args.backups);
        if (storage.stores.length > 0)
            await storage.makeAvailable();
        const serviceOptions = Services.createDefaultOptions(chain);
        serviceOptions.taalApiKey = args.env.taalApiKey;
        const services = new Services(args.chain);
        const monopts = Monitor.createDefaultWalletMonitorOptions(chain, storage, services);
        const monitor = new Monitor(monopts);
        monitor.addDefaultTasks();
        let privilegedKeyManager: sdk.PrivilegedKeyManager | undefined = undefined;
        if (args.privKeyHex) {
            const privKey = PrivateKey.fromString(args.privKeyHex);
            privilegedKeyManager = new sdk.PrivilegedKeyManager(async () => privKey);
        }
        const wallet = new Wallet({
            chain,
            keyDeriver,
            storage,
            services,
            monitor,
            privilegedKeyManager
        });
        const r: SetupWallet = {
            rootKey,
            identityKey,
            keyDeriver,
            chain,
            storage,
            services,
            monitor,
            wallet
        };
        return r;
    }
    static async createWalletWithStorageClient(args: SetupWalletClientArgs): Promise<SetupWalletClient> 
    static getKeyPair(priv?: string | PrivateKey): KeyPairAddress 
    static getLockP2PKH(address: string) 
    static getUnlockP2PKH(priv: PrivateKey, satoshis: number): sdk.ScriptTemplateUnlock 
    static createP2PKHOutputs(outputs: {
        address: string;
        satoshis: number;
        outputDescription?: string;
        basket?: string;
        tags?: string[];
    }[]): CreateActionOutput[] 
    static async createP2PKHOutputsAction(wallet: WalletInterface, outputs: {
        address: string;
        satoshis: number;
        outputDescription?: string;
        basket?: string;
        tags?: string[];
    }[], options?: CreateActionOptions): Promise<{
        cr: CreateActionResult;
        outpoints: string[] | undefined;
    }> 
    static async fundWalletFromP2PKHOutpoints(wallet: WalletInterface, outpoints: string[], p2pkhKey: KeyPairAddress, inputBEEF?: BEEF) 
}
```

See also: [Chain](#type-chain), [KeyPairAddress](#type-keypairaddress), [Monitor](#class-monitor), [PrivilegedKeyManager](#class-privilegedkeymanager), [ScriptTemplateUnlock](#interface-scripttemplateunlock), [Services](#class-services), [SetupEnv](#interface-setupenv), [SetupWallet](#interface-setupwallet), [SetupWalletArgs](#interface-setupwalletargs), [SetupWalletClient](#interface-setupwalletclient), [SetupWalletClientArgs](#interface-setupwalletclientargs), [Wallet](#class-wallet), [WalletStorageManager](#class-walletstoragemanager)

<details>

<summary>Class SetupClient Details</summary>

#### Method createWallet

Create a `Wallet`. Storage can optionally be provided or configured later.

The following components are configured: KeyDeriver, WalletStorageManager, WalletService, WalletStorage.
Optionally, PrivilegedKeyManager is also configured.

```ts
static async createWallet(args: SetupWalletArgs): Promise<SetupWallet> {
    args.chain ||= args.env.chain;
    args.rootKeyHex ||= args.env.devKeys[args.env.identityKey];
    const rootKey = PrivateKey.fromHex(args.rootKeyHex);
    const identityKey = rootKey.toPublicKey().toString();
    const keyDeriver = new KeyDeriver(rootKey);
    const chain = args.chain;
    const storage = new WalletStorageManager(identityKey, args.active, args.backups);
    if (storage.stores.length > 0)
        await storage.makeAvailable();
    const serviceOptions = Services.createDefaultOptions(chain);
    serviceOptions.taalApiKey = args.env.taalApiKey;
    const services = new Services(args.chain);
    const monopts = Monitor.createDefaultWalletMonitorOptions(chain, storage, services);
    const monitor = new Monitor(monopts);
    monitor.addDefaultTasks();
    let privilegedKeyManager: sdk.PrivilegedKeyManager | undefined = undefined;
    if (args.privKeyHex) {
        const privKey = PrivateKey.fromString(args.privKeyHex);
        privilegedKeyManager = new sdk.PrivilegedKeyManager(async () => privKey);
    }
    const wallet = new Wallet({
        chain,
        keyDeriver,
        storage,
        services,
        monitor,
        privilegedKeyManager
    });
    const r: SetupWallet = {
        rootKey,
        identityKey,
        keyDeriver,
        chain,
        storage,
        services,
        monitor,
        wallet
    };
    return r;
}
```
See also: [Monitor](#class-monitor), [PrivilegedKeyManager](#class-privilegedkeymanager), [Services](#class-services), [SetupWallet](#interface-setupwallet), [SetupWalletArgs](#interface-setupwalletargs), [Wallet](#class-wallet), [WalletStorageManager](#class-walletstoragemanager)

#### Method getEnv

Reads a .env file of the format created by `makeEnv`.

Returns values for designated `chain`.

Access private keys through the `devKeys` object: `devKeys[identityKey]`

```ts
static getEnv(chain: sdk.Chain): SetupEnv 
```
See also: [Chain](#type-chain), [SetupEnv](#interface-setupenv)

Returns

with configuration environment secrets used by `Setup` functions.

Argument Details

+ **chain**
  + Which chain to use: 'test' or 'main'

#### Method makeEnv

Creates content for .env file with some private keys, identity keys, sample API keys, and sample MySQL connection string.

Two new, random private keys are generated each time, with their associated public identity keys.

Loading secrets from a .env file is intended only for experimentation and getting started.
Private keys should never be included directly in your source code.

```ts
static makeEnv(): string 
```

</details>

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
## Functions

## Types

### Type: KeyPairAddress

```ts
export type KeyPairAddress = {
    privateKey: PrivateKey;
    publicKey: PublicKey;
    address: string;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
## Variables

