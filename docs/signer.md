# API

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

## Interfaces

| |
| --- |
| [PendingSignAction](#interface-pendingsignaction) |
| [PendingStorageInput](#interface-pendingstorageinput) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

### Interface: PendingSignAction

```ts
export interface PendingSignAction {
    reference: string;
    dcr: sdk.StorageCreateActionResult;
    args: sdk.ValidCreateActionArgs;
    tx: BsvTransaction;
    amount: number;
    pdi: PendingStorageInput[];
}
```

See also: [PendingStorageInput](#interface-pendingstorageinput), [StorageCreateActionResult](#interface-storagecreateactionresult), [ValidCreateActionArgs](#interface-validcreateactionargs)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Interface: PendingStorageInput

```ts
export interface PendingStorageInput {
    vin: number;
    derivationPrefix: string;
    derivationSuffix: string;
    unlockerPubKey?: string;
    sourceSatoshis: number;
    lockingScript: string;
}
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
## Classes

### Class: WalletSigner

```ts
export class WalletSigner implements sdk.WalletSigner {
    chain: sdk.Chain;
    keyDeriver: KeyDeriverApi;
    storage: WalletStorageManager;
    _services?: sdk.WalletServices;
    identityKey: string;
    pendingSignActions: Record<string, PendingSignAction>;
    constructor(chain: sdk.Chain, keyDeriver: KeyDeriver, storage: WalletStorageManager) 
    getProtoWallet(): ProtoWallet 
    setServices(v: sdk.WalletServices) 
    getServices(): sdk.WalletServices 
    getStorageIdentity(): sdk.StorageIdentity 
    getClientChangeKeyPair(): sdk.KeyPair 
    async getChain(): Promise<sdk.Chain> 
    async listActions(args: ListActionsArgs): Promise<ListActionsResult> 
    async listOutputs(args: ListOutputsArgs): Promise<ListOutputsResult> 
    async listCertificates(args: ListCertificatesArgs): Promise<ListCertificatesResult> 
    async abortAction(args: AbortActionArgs): Promise<AbortActionResult> 
    async createAction(args: CreateActionArgs): Promise<CreateActionResult> 
    async signAction(args: SignActionArgs): Promise<SignActionResult> 
    async internalizeAction(args: InternalizeActionArgs): Promise<InternalizeActionResult> 
    async relinquishOutput(args: RelinquishOutputArgs): Promise<RelinquishOutputResult> 
    async relinquishCertificate(args: RelinquishCertificateArgs): Promise<RelinquishCertificateResult> 
    async acquireDirectCertificate(args: AcquireCertificateArgs): Promise<AcquireCertificateResult> 
    async proveCertificate(args: ProveCertificateArgs): Promise<ProveCertificateResult> 
    async discoverByIdentityKey(args: DiscoverByIdentityKeyArgs): Promise<DiscoverCertificatesResult> 
    async discoverByAttributes(args: DiscoverByAttributesArgs): Promise<DiscoverCertificatesResult> 
}
```

See also: [AbortActionArgs](#interface-abortactionargs), [AbortActionResult](#interface-abortactionresult), [AcquireCertificateArgs](#interface-acquirecertificateargs), [AcquireCertificateResult](#interface-acquirecertificateresult), [Chain](#type-chain), [CreateActionArgs](#interface-createactionargs), [CreateActionResult](#interface-createactionresult), [DiscoverByAttributesArgs](#interface-discoverbyattributesargs), [DiscoverByIdentityKeyArgs](#interface-discoverbyidentitykeyargs), [DiscoverCertificatesResult](#interface-discovercertificatesresult), [InternalizeActionArgs](#interface-internalizeactionargs), [InternalizeActionResult](#interface-internalizeactionresult), [KeyPair](#interface-keypair), [ListActionsArgs](#interface-listactionsargs), [ListActionsResult](#interface-listactionsresult), [ListCertificatesArgs](#interface-listcertificatesargs), [ListCertificatesResult](#interface-listcertificatesresult), [ListOutputsArgs](#interface-listoutputsargs), [ListOutputsResult](#interface-listoutputsresult), [PendingSignAction](#interface-pendingsignaction), [ProveCertificateArgs](#interface-provecertificateargs), [ProveCertificateResult](#interface-provecertificateresult), [RelinquishCertificateArgs](#interface-relinquishcertificateargs), [RelinquishCertificateResult](#interface-relinquishcertificateresult), [RelinquishOutputArgs](#interface-relinquishoutputargs), [RelinquishOutputResult](#interface-relinquishoutputresult), [SignActionArgs](#interface-signactionargs), [SignActionResult](#interface-signactionresult), [StorageIdentity](#interface-storageidentity), [WalletServices](#interface-walletservices), [WalletStorageManager](#class-walletstoragemanager), [acquireDirectCertificate](#function-acquiredirectcertificate), [createAction](#function-createaction), [internalizeAction](#function-internalizeaction), [listCertificates](#function-listcertificates), [proveCertificate](#function-provecertificate), [signAction](#function-signaction)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
## Functions

| |
| --- |
| [acquireDirectCertificate](#function-acquiredirectcertificate) |
| [completeSignedTransaction](#function-completesignedtransaction) |
| [completeSignedTransaction](#function-completesignedtransaction) |
| [createAction](#function-createaction) |
| [internalizeAction](#function-internalizeaction) |
| [makeAtomicBeef](#function-makeatomicbeef) |
| [processAction](#function-processaction) |
| [proveCertificate](#function-provecertificate) |
| [signAction](#function-signaction) |

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---

### Function: acquireDirectCertificate

```ts
export async function acquireDirectCertificate(signer: WalletSigner, auth: sdk.AuthId, vargs: sdk.ValidAcquireDirectCertificateArgs): Promise<AcquireCertificateResult> 
```

See also: [AcquireCertificateResult](#interface-acquirecertificateresult), [AuthId](#interface-authid), [ValidAcquireDirectCertificateArgs](#interface-validacquiredirectcertificateargs), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: completeSignedTransaction

```ts
export async function completeSignedTransaction(prior: PendingSignAction, spends: Record<number, SignActionSpend>, signer: WalletSigner): Promise<Transaction> 
```

See also: [PendingSignAction](#interface-pendingsignaction), [SignActionSpend](#interface-signactionspend), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: completeSignedTransaction

```ts
export async function completeSignedTransaction(prior: PendingSignAction, spends: Record<number, SignActionSpend>, ninja: WalletSigner): Promise<BsvTransaction> 
```

See also: [PendingSignAction](#interface-pendingsignaction), [SignActionSpend](#interface-signactionspend), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: createAction

```ts
export async function createAction(signer: WalletSigner, auth: sdk.AuthId, vargs: sdk.ValidCreateActionArgs): Promise<CreateActionResult> 
```

See also: [AuthId](#interface-authid), [CreateActionResult](#interface-createactionresult), [ValidCreateActionArgs](#interface-validcreateactionargs), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: internalizeAction

Internalize Action allows a wallet to take ownership of outputs in a pre-existing transaction.
The transaction may, or may not already be known to both the storage and user.

Two types of outputs are handled: "wallet payments" and "basket insertions".

A "basket insertion" output is considered a custom output and has no effect on the wallet's "balance".

A "wallet payment" adds an outputs value to the wallet's change "balance". These outputs are assigned to the "default" basket.

Processing starts with simple validation and then checks for a pre-existing transaction.
If the transaction is already known to the user, then the outputs are reviewed against the existing outputs treatment,
and merge rules are added to the arguments passed to the storage layer.
The existing transaction must be in the 'unproven' or 'completed' status. Any other status is an error.

When the transaction already exists, the description is updated. The isOutgoing sense is not changed.

"basket insertion" Merge Rules:
1. The "default" basket may not be specified as the insertion basket.
2. A change output in the "default" basket may not be target of an insertion into a different basket.
3. These baskets do not affect the wallet's balance and are typed "custom".

"wallet payment" Merge Rules:
1. Targetting an existing change "default" basket output results in a no-op. No error. No alterations made.
2. Targetting a previously "custom" non-change output converts it into a change output. This alters the transaction's `amount`, and the wallet balance.

```ts
export async function internalizeAction(signer: WalletSigner, auth: sdk.AuthId, args: InternalizeActionArgs): Promise<InternalizeActionResult> 
```

See also: [AuthId](#interface-authid), [InternalizeActionArgs](#interface-internalizeactionargs), [InternalizeActionResult](#interface-internalizeactionresult), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: makeAtomicBeef

```ts
export function makeAtomicBeef(tx: BsvTransaction, beef: number[] | Beef): number[] 
```

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: processAction

```ts
export async function processAction(prior: PendingSignAction | undefined, signer: WalletSigner, auth: sdk.AuthId, vargs: sdk.ValidProcessActionArgs): Promise<SendWithResult[] | undefined> 
```

See also: [AuthId](#interface-authid), [PendingSignAction](#interface-pendingsignaction), [SendWithResult](#interface-sendwithresult), [ValidProcessActionArgs](#interface-validprocessactionargs), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: proveCertificate

```ts
export async function proveCertificate(signer: WalletSigner, auth: sdk.AuthId, vargs: sdk.ValidProveCertificateArgs): Promise<ProveCertificateResult> 
```

See also: [AuthId](#interface-authid), [ProveCertificateResult](#interface-provecertificateresult), [ValidProveCertificateArgs](#interface-validprovecertificateargs), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
### Function: signAction

```ts
export async function signAction(signer: WalletSigner, auth: sdk.AuthId, vargs: sdk.ValidSignActionArgs): Promise<SignActionResult> 
```

See also: [AuthId](#interface-authid), [SignActionResult](#interface-signactionresult), [ValidSignActionArgs](#interface-validsignactionargs), [WalletSigner](#class-walletsigner)

Links: [API](#api), [Interfaces](#interfaces), [Classes](#classes), [Functions](#functions), [Types](#types), [Variables](#variables)

---
## Types

## Variables

