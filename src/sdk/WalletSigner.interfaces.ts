import { AbortActionArgs, AbortActionResult, AcquireCertificateArgs, AcquireCertificateResult, CreateActionArgs, CreateActionResult, DiscoverByAttributesArgs, DiscoverByIdentityKeyArgs, DiscoverCertificatesResult, InternalizeActionArgs, InternalizeActionResult, KeyDeriverApi, ListActionsArgs, ListActionsResult, ListCertificatesArgs, ListCertificatesResult, ListOutputsArgs, ListOutputsResult, ProveCertificateArgs, ProveCertificateResult, RelinquishCertificateArgs, RelinquishCertificateResult, RelinquishOutputArgs, RelinquishOutputResult, SignActionArgs, SignActionResult } from '@bsv/sdk'
import { sdk } from "../index.client";

/**
 */
export interface WalletSigner {
  chain: sdk.Chain
  keyDeriver: KeyDeriverApi

  setServices(v: sdk.WalletServices) : void
  getServices() : sdk.WalletServices
  getStorageIdentity(): StorageIdentity

  listActions(args: ListActionsArgs): Promise<ListActionsResult>
  listOutputs(args: ListOutputsArgs, knwonTxids: string[]): Promise<ListOutputsResult>
  createAction(args: CreateActionArgs): Promise<CreateActionResult>
  signAction(args: SignActionArgs): Promise<SignActionResult>
  abortAction(args: AbortActionArgs): Promise<AbortActionResult>
  internalizeAction(args: InternalizeActionArgs): Promise<InternalizeActionResult>
  relinquishOutput(args: RelinquishOutputArgs) : Promise<RelinquishOutputResult>

  acquireDirectCertificate(args: AcquireCertificateArgs) : Promise<AcquireCertificateResult>
  listCertificates(args: ListCertificatesArgs) : Promise<ListCertificatesResult>
  proveCertificate(args: ProveCertificateArgs): Promise<ProveCertificateResult>
  relinquishCertificate(args: RelinquishCertificateArgs): Promise<RelinquishCertificateResult>
  discoverByIdentityKey(args: DiscoverByIdentityKeyArgs): Promise<DiscoverCertificatesResult>
  discoverByAttributes(args: DiscoverByAttributesArgs): Promise<DiscoverCertificatesResult>

  getChain(): Promise<sdk.Chain>
  getClientChangeKeyPair(): KeyPair;
}

export interface KeyPair {
  privateKey: string
  publicKey: string
}

export interface StorageIdentity {
   /**
    * The identity key (public key) assigned to this storage
    */
   storageIdentityKey: string
   /**
    * The human readable name assigned to this storage.
    */
   storageName: string
}

export interface EntityTimeStamp {
    created_at: Date
    updated_at: Date
}
