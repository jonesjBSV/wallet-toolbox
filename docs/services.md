# SERVICES: BSV Wallet Toolbox API Documentation

The documentation is split into various pages, this page covers the [Services](#class-services) and related API.

To function properly, a wallet makes use of a variety of services provided by the network:

1. Broadcast new transactions.
1. Verify the validity of unspent outputs.
1. Obtain mined transaction proofs.
2. Obtain block headers for proof validation.
3. Obtain exchange rates for UI and fee calculations.

These tasks are the responsibility of the [Services](#class-services) class.

[Return To Top](./README.md)

<!--#region ts2md-api-merged-here-->
### API

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

#### Interfaces

| |
| --- |
| [ArcMinerGetTxData](#interface-arcminergettxdata) |
| [ArcMinerPostBeefDataApi](#interface-arcminerpostbeefdataapi) |
| [ArcMinerPostTxsData](#interface-arcminerposttxsdata) |
| [ArcServiceConfig](#interface-arcserviceconfig) |
| [ExchangeRatesIoApi](#interface-exchangeratesioapi) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

##### Interface: ArcMinerGetTxData

```ts
export interface ArcMinerGetTxData {
    status: number;
    title: string;
    blockHash: string;
    blockHeight: number;
    competingTxs: null | string[];
    extraInfo: string;
    merklePath: string;
    timestamp: string;
    txid: string;
    txStatus: string;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Interface: ArcMinerPostBeefDataApi

```ts
export interface ArcMinerPostBeefDataApi {
    status: number;
    title: string;
    blockHash?: string;
    blockHeight?: number;
    competingTxs?: null;
    extraInfo: string;
    merklePath?: string;
    timestamp?: string;
    txid?: string;
    txStatus?: string;
    type?: string;
    detail?: string;
    instance?: string;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Interface: ArcMinerPostTxsData

```ts
export interface ArcMinerPostTxsData {
    status: number;
    title: string;
    blockHash: string;
    blockHeight: number;
    competingTxs: null | string[];
    extraInfo: string;
    merklePath: string;
    timestamp: string;
    txid: string;
    txStatus: string;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Interface: ArcServiceConfig

```ts
export interface ArcServiceConfig {
    name: string;
    url: string;
    arcConfig: ArcConfig;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Interface: ExchangeRatesIoApi

```ts
export interface ExchangeRatesIoApi {
    success: boolean;
    timestamp: number;
    base: "EUR" | "USD";
    date: string;
    rates: Record<string, number>;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
#### Classes

| |
| --- |
| [ServiceCollection](#class-servicecollection) |
| [Services](#class-services) |
| [WhatsOnChain](#class-whatsonchain) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

##### Class: ServiceCollection

```ts
export class ServiceCollection<T> {
    services: {
        name: string;
        service: T;
    }[];
    _index: number;
    constructor(services?: {
        name: string;
        service: T;
    }[]) 
    add(s: {
        name: string;
        service: T;
    }): ServiceCollection<T> 
    remove(name: string): void 
    get name() 
    get service() 
    get allServices() 
    get count() 
    get index() 
    reset() 
    next(): number 
    clone(): ServiceCollection<T> 
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Class: Services

```ts
export class Services implements sdk.WalletServices {
    static createDefaultOptions(chain: sdk.Chain): sdk.WalletServicesOptions 
    options: sdk.WalletServicesOptions;
    whatsonchain: WhatsOnChain;
    getMerklePathServices: ServiceCollection<sdk.GetMerklePathService>;
    getRawTxServices: ServiceCollection<sdk.GetRawTxService>;
    postTxsServices: ServiceCollection<sdk.PostTxsService>;
    postBeefServices: ServiceCollection<sdk.PostBeefService>;
    getUtxoStatusServices: ServiceCollection<sdk.GetUtxoStatusService>;
    updateFiatExchangeRateServices: ServiceCollection<sdk.UpdateFiatExchangeRateService>;
    chain: sdk.Chain;
    constructor(optionsOrChain: sdk.Chain | sdk.WalletServicesOptions) 
    async getChainTracker(): Promise<ChainTracker> 
    async getBsvExchangeRate(): Promise<number> 
    async getFiatExchangeRate(currency: "USD" | "GBP" | "EUR", base?: "USD" | "GBP" | "EUR"): Promise<number> 
    get getProofsCount() 
    get getRawTxsCount() 
    get postTxsServicesCount() 
    get postBeefServicesCount() 
    get getUtxoStatsCount() 
    async getUtxoStatus(output: string, outputFormat?: sdk.GetUtxoStatusOutputFormat, useNext?: boolean): Promise<sdk.GetUtxoStatusResult> 
    async postTxs(beef: Beef, txids: string[]): Promise<sdk.PostTxsResult[]> 
    async postBeef(beef: Beef, txids: string[]): Promise<sdk.PostBeefResult[]> 
    async getRawTx(txid: string, useNext?: boolean): Promise<sdk.GetRawTxResult> 
    async invokeChaintracksWithRetry<R>(method: () => Promise<R>): Promise<R> 
    async getHeaderForHeight(height: number): Promise<number[]> 
    async getHeight(): Promise<number> 
    async hashToHeader(hash: string): Promise<sdk.BlockHeader> 
    async getMerklePath(txid: string, useNext?: boolean): Promise<sdk.GetMerklePathResult> 
    targetCurrencies = ["USD", "GBP", "EUR"];
    async updateFiatExchangeRates(rates?: sdk.FiatExchangeRates, updateMsecs?: number): Promise<sdk.FiatExchangeRates> 
    async nLockTimeIsFinal(tx: string | number[] | BsvTransaction | number): Promise<boolean> 
}
```

See also: [BlockHeader](./client.md#interface-blockheader), [Chain](./client.md#type-chain), [FiatExchangeRates](./client.md#interface-fiatexchangerates), [GetMerklePathResult](./client.md#interface-getmerklepathresult), [GetMerklePathService](./client.md#type-getmerklepathservice), [GetRawTxResult](./client.md#interface-getrawtxresult), [GetRawTxService](./client.md#type-getrawtxservice), [GetUtxoStatusOutputFormat](./client.md#type-getutxostatusoutputformat), [GetUtxoStatusResult](./client.md#interface-getutxostatusresult), [GetUtxoStatusService](./client.md#type-getutxostatusservice), [PostBeefResult](./client.md#interface-postbeefresult), [PostBeefService](./client.md#type-postbeefservice), [PostTxsResult](./client.md#interface-posttxsresult), [PostTxsService](./client.md#type-posttxsservice), [ServiceCollection](./services.md#class-servicecollection), [UpdateFiatExchangeRateService](./client.md#type-updatefiatexchangerateservice), [WalletServices](./client.md#interface-walletservices), [WalletServicesOptions](./client.md#interface-walletservicesoptions), [WhatsOnChain](./services.md#class-whatsonchain)

###### Method postTxs

The beef must contain at least each rawTx for each txid.
Some services may require input transactions as well.
These will be fetched if missing, greatly extending the service response time.

```ts
async postTxs(beef: Beef, txids: string[]): Promise<sdk.PostTxsResult[]> 
```
See also: [PostTxsResult](./client.md#interface-posttxsresult)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Class: WhatsOnChain

```ts
export class WhatsOnChain extends SdkWhatsOnChain {
    constructor(chain: sdk.Chain = "main", config: WhatsOnChainConfig = {}) 
    async getTxPropagation(txid: string): Promise<number> 
    async getRawTx(txid: string): Promise<string | undefined> 
    async getRawTxResult(txid: string): Promise<sdk.GetRawTxResult> 
    async postRawTx(rawTx: HexString): Promise<string> 
    async getMerklePath(txid: string, services: sdk.WalletServices): Promise<sdk.GetMerklePathResult> 
    async updateBsvExchangeRate(rate?: sdk.BsvExchangeRate, updateMsecs?: number): Promise<sdk.BsvExchangeRate> 
    async getUtxoStatus(output: string, outputFormat?: sdk.GetUtxoStatusOutputFormat): Promise<sdk.GetUtxoStatusResult> 
}
```

See also: [BsvExchangeRate](./client.md#interface-bsvexchangerate), [Chain](./client.md#type-chain), [GetMerklePathResult](./client.md#interface-getmerklepathresult), [GetRawTxResult](./client.md#interface-getrawtxresult), [GetUtxoStatusOutputFormat](./client.md#type-getutxostatusoutputformat), [GetUtxoStatusResult](./client.md#interface-getutxostatusresult), [WalletServices](./client.md#interface-walletservices)

###### Method getRawTx

May return undefined for unmined transactions that are in the mempool.

```ts
async getRawTx(txid: string): Promise<string | undefined> 
```

Returns

raw transaction as hex string or undefined if txid not found in mined block.

###### Method getTxPropagation

2025-02-16 throwing internal server error 500.

```ts
async getTxPropagation(txid: string): Promise<number> 
```

###### Method postRawTx

```ts
async postRawTx(rawTx: HexString): Promise<string> 
```

Returns

txid returned by transaction processor of transaction broadcast

Argument Details

+ **rawTx**
  + raw transaction to broadcast as hex string

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
#### Functions

| | |
| --- | --- |
| [createDefaultWalletServicesOptions](#function-createdefaultwalletservicesoptions) | [makePostTxsToTaalARC](#function-makeposttxstotaalarc) |
| [getExchangeRatesIo](#function-getexchangeratesio) | [postBeefToArcMiner](#function-postbeeftoarcminer) |
| [getMerklePathFromTaalARC](#function-getmerklepathfromtaalarc) | [postBeefToTaalArcMiner](#function-postbeeftotaalarcminer) |
| [getTaalArcServiceConfig](#function-gettaalarcserviceconfig) | [postTxsToTaalArcMiner](#function-posttxstotaalarcminer) |
| [makeErrorResult](#function-makeerrorresult) | [toBinaryBaseBlockHeader](#function-tobinarybaseblockheader) |
| [makeGetMerklePathFromTaalARC](#function-makegetmerklepathfromtaalarc) | [updateChaintracksFiatExchangeRates](#function-updatechaintracksfiatexchangerates) |
| [makePostBeefResult](#function-makepostbeefresult) | [updateExchangeratesapi](#function-updateexchangeratesapi) |
| [makePostBeefToTaalARC](#function-makepostbeeftotaalarc) | [validateScriptHash](#function-validatescripthash) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

##### Function: createDefaultWalletServicesOptions

```ts
export function createDefaultWalletServicesOptions(chain: sdk.Chain): sdk.WalletServicesOptions 
```

See also: [Chain](./client.md#type-chain), [WalletServicesOptions](./client.md#interface-walletservicesoptions)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: getExchangeRatesIo

```ts
export async function getExchangeRatesIo(key: string): Promise<ExchangeRatesIoApi> 
```

See also: [ExchangeRatesIoApi](./services.md#interface-exchangeratesioapi)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: getMerklePathFromTaalARC

```ts
export async function getMerklePathFromTaalARC(txid: string, config: ArcServiceConfig, services: sdk.WalletServices): Promise<sdk.GetMerklePathResult> 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [GetMerklePathResult](./client.md#interface-getmerklepathresult), [WalletServices](./client.md#interface-walletservices)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: getTaalArcServiceConfig

```ts
export function getTaalArcServiceConfig(chain: sdk.Chain, apiKey: string): ArcServiceConfig 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [Chain](./client.md#type-chain)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: makeErrorResult

```ts
export function makeErrorResult(error: sdk.WalletError, miner: ArcServiceConfig, beef: number[], txids: string[], dd?: ArcMinerPostBeefDataApi): sdk.PostBeefResult 
```

See also: [ArcMinerPostBeefDataApi](./services.md#interface-arcminerpostbeefdataapi), [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostBeefResult](./client.md#interface-postbeefresult), [WalletError](./client.md#class-walleterror)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: makeGetMerklePathFromTaalARC

```ts
export function makeGetMerklePathFromTaalARC(config: ArcServiceConfig): sdk.GetMerklePathService 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [GetMerklePathService](./client.md#type-getmerklepathservice)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: makePostBeefResult

```ts
export function makePostBeefResult(dd: ArcMinerPostBeefDataApi, miner: ArcServiceConfig, beef: number[], txids: string[]): sdk.PostBeefResult 
```

See also: [ArcMinerPostBeefDataApi](./services.md#interface-arcminerpostbeefdataapi), [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostBeefResult](./client.md#interface-postbeefresult)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: makePostBeefToTaalARC

```ts
export function makePostBeefToTaalARC(config: ArcServiceConfig): sdk.PostBeefService 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostBeefService](./client.md#type-postbeefservice)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: makePostTxsToTaalARC

```ts
export function makePostTxsToTaalARC(config: ArcServiceConfig): sdk.PostTxsService 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostTxsService](./client.md#type-posttxsservice)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: postBeefToArcMiner

```ts
export async function postBeefToArcMiner(beef: Beef | number[], txids: string[], config: ArcServiceConfig): Promise<sdk.PostBeefResult> 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostBeefResult](./client.md#interface-postbeefresult)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: postBeefToTaalArcMiner

```ts
export async function postBeefToTaalArcMiner(beef: Beef, txids: string[], config: ArcServiceConfig, services: sdk.WalletServices): Promise<sdk.PostBeefResult> 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostBeefResult](./client.md#interface-postbeefresult), [WalletServices](./client.md#interface-walletservices)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: postTxsToTaalArcMiner

```ts
export async function postTxsToTaalArcMiner(beef: Beef, txids: string[], config: ArcServiceConfig, services: sdk.WalletServices): Promise<sdk.PostTxsResult> 
```

See also: [ArcServiceConfig](./services.md#interface-arcserviceconfig), [PostTxsResult](./client.md#interface-posttxsresult), [WalletServices](./client.md#interface-walletservices)

Argument Details

+ **txs**
  + All transactions must have source transactions. Will just source locking scripts and satoshis do?? toHexEF() is used.

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: toBinaryBaseBlockHeader

Serializes a block header as an 80 byte array.
The exact serialized format is defined in the Bitcoin White Paper
such that computing a double sha256 hash of the array computes
the block hash for the header.

```ts
export function toBinaryBaseBlockHeader(header: sdk.BaseBlockHeader): number[] {
    const writer = new Utils.Writer();
    writer.writeUInt32BE(header.version);
    writer.writeReverse(asArray(header.previousHash));
    writer.writeReverse(asArray(header.merkleRoot));
    writer.writeUInt32BE(header.time);
    writer.writeUInt32BE(header.bits);
    writer.writeUInt32BE(header.nonce);
    const r = writer.toArray();
    return r;
}
```

See also: [BaseBlockHeader](./client.md#interface-baseblockheader), [asArray](./client.md#function-asarray)

Returns

80 byte array

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: updateChaintracksFiatExchangeRates

```ts
export async function updateChaintracksFiatExchangeRates(targetCurrencies: string[], options: sdk.WalletServicesOptions): Promise<sdk.FiatExchangeRates> 
```

See also: [FiatExchangeRates](./client.md#interface-fiatexchangerates), [WalletServicesOptions](./client.md#interface-walletservicesoptions)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: updateExchangeratesapi

```ts
export async function updateExchangeratesapi(targetCurrencies: string[], options: sdk.WalletServicesOptions): Promise<sdk.FiatExchangeRates> 
```

See also: [FiatExchangeRates](./client.md#interface-fiatexchangerates), [WalletServicesOptions](./client.md#interface-walletservicesoptions)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
##### Function: validateScriptHash

```ts
export function validateScriptHash(output: string, outputFormat?: sdk.GetUtxoStatusOutputFormat): string 
```

See also: [GetUtxoStatusOutputFormat](./client.md#type-getutxostatusoutputformat)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
#### Types

#### Variables


<!--#endregion ts2md-api-merged-here-->
