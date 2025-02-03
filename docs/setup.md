# API

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

## Interfaces

| |
| --- |
| [SetupWallet](#interface-setupwallet) |
| [SetupWalletOnly](#interface-setupwalletonly) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

### Interface: SetupWallet

```ts
export interface SetupWallet extends SetupWalletOnly {
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

See also: [Chain](#type-chain), [Monitor](#class-monitor), [Services](#class-services), [SetupWalletOnly](#interface-setupwalletonly), [StorageKnex](#class-storageknex), [Wallet](#class-wallet), [WalletStorageManager](#class-walletstoragemanager)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: SetupWalletOnly

```ts
export interface SetupWalletOnly {
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
## Classes

| |
| --- |
| [Setup](#class-setup) |
| [SetupClient](#class-setupclient) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

### Class: Setup

This class provides static setup functions to construct BRC-100 compatible
wallets in a variety of configurations.

It serves as a starting point for experimentation and customization.

```ts
export abstract class Setup extends SetupClient {
    static async createKnexWallet(args: {
        knex: Knex<any, any[]>;
        databaseName: string;
        chain?: sdk.Chain;
        rootKeyHex?: string;
        privKeyHex?: string;
    }): Promise<SetupWallet> 
    static createSQLiteKnex(filename: string): Knex 
    static createMySQLKnex(connection: string, database?: string): Knex 
    static async createMySQLWallet(args: {
        databaseName: string;
        chain?: sdk.Chain;
        rootKeyHex?: string;
        privKeyHex?: string;
    }): Promise<SetupWallet> 
    static async createSQLiteWallet(args: {
        filePath: string;
        databaseName: string;
        chain?: sdk.Chain;
        rootKeyHex?: string;
        privKeyHex?: string;
    }): Promise<SetupWallet> 
}
```

See also: [Chain](#type-chain), [SetupClient](#class-setupclient), [SetupWallet](#interface-setupwallet)

<details>

<summary>Class Setup Details</summary>

#### Method createKnexWallet

Adds `Knex` based storage to a `Wallet` configured by `Setup.createWalletOnly`

```ts
static async createKnexWallet(args: {
    knex: Knex<any, any[]>;
    databaseName: string;
    chain?: sdk.Chain;
    rootKeyHex?: string;
    privKeyHex?: string;
}): Promise<SetupWallet> 
```
See also: [Chain](#type-chain), [SetupWallet](#interface-setupwallet)

</details>

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Class: SetupClient

This class provides static setup functions to construct BRC-100 compatible
wallets in a variety of configurations.

It serves as a starting point for experimentation and customization.

```ts
export abstract class SetupClient {
    static makeEnv(chain: sdk.Chain): void {
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
    }
    static getEnv(chain: sdk.Chain) 
    static async createNoSendP2PKHOutpoint(basket: string, address: string, satoshis: number, noSendChange: string[] | undefined, wallet: WalletInterface): Promise<{
        noSendChange: string[];
        txid: string;
        cr: CreateActionResult;
        sr: SignActionResult;
    }> 
    static async createNoSendP2PKHOutpoints(count: number, basket: string, address: string, satoshis: number, noSendChange: string[] | undefined, wallet: WalletInterface): Promise<{
        noSendChange: string[];
        txid: string;
        cr: CreateActionResult;
        sr: SignActionResult;
    }> 
    static getKeyPair(priv?: string | PrivateKey): KeyPairAddress 
    static getLockP2PKH(address: string) 
    static getUnlockP2PKH(priv: PrivateKey, satoshis: number) 
    static async createWalletOnly(args: {
        chain?: sdk.Chain;
        rootKeyHex?: string;
        active?: sdk.WalletStorageProvider;
        backups?: sdk.WalletStorageProvider[];
        privKeyHex?: string;
    }): Promise<SetupWalletOnly> 
    static async createWalletWithStorageClient(args: {
        rootKeyHex?: string;
        endpointUrl?: string;
        chain?: sdk.Chain;
    }): Promise<SetupWalletOnly> 
}
```

See also: [Chain](#type-chain), [KeyPairAddress](#type-keypairaddress), [SetupWalletOnly](#interface-setupwalletonly), [WalletStorageProvider](#interface-walletstorageprovider)

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

