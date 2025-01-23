import {
    Beef,
    BeefParty,
    Utils,
    WalletInterface,
    ProtoWallet,
    TrustSelf,
    OriginatorDomainNameStringUnder250Bytes,
    ListActionsArgs,
    ListActionsResult,
    CreateActionArgs,
    CreateActionResult,
    ListOutputsArgs,
    ListOutputsResult,
    ListCertificatesArgs,
    ListCertificatesResult,
    AcquireCertificateArgs,
    AcquireCertificateResult,
    RelinquishCertificateArgs,
    RelinquishCertificateResult,
    ProveCertificateArgs,
    ProveCertificateResult,
    DiscoverByIdentityKeyArgs,
    DiscoverCertificatesResult,
    DiscoverByAttributesArgs,
    RelinquishOutputArgs,
    RelinquishOutputResult,
    AuthenticatedResult,
    GetHeightResult,
    GetHeaderResult,
    GetHeaderArgs,
    GetNetworkResult,
    GetVersionResult,
    CreateHmacArgs,
    CreateHmacResult,
    CreateSignatureArgs,
    CreateSignatureResult,
    GetPublicKeyArgs,
    GetPublicKeyResult,
    RevealCounterpartyKeyLinkageArgs,
    RevealCounterpartyKeyLinkageResult,
    RevealSpecificKeyLinkageArgs,
    RevealSpecificKeyLinkageResult,
    VerifyHmacArgs,
    VerifyHmacResult,
    VerifySignatureArgs,
    VerifySignatureResult,
    WalletDecryptArgs,
    WalletDecryptResult,
    WalletEncryptArgs,
    WalletEncryptResult,
    AbortActionArgs,
    AbortActionResult,
    SignActionResult,
    SignActionArgs,
    InternalizeActionArgs,
    InternalizeActionResult,
    PubKeyHex
} from "@bsv/sdk";
import { sdk, toWalletNetwork, Monitor } from './index.client'

export class Wallet implements WalletInterface {
    signer: sdk.WalletSigner
    services?: sdk.WalletServices
    monitor?: Monitor

    beef: BeefParty
    trustSelf?: TrustSelf
    userParty: string
    proto: ProtoWallet

    constructor(signer: sdk.WalletSigner, services?: sdk.WalletServices, monitor?: Monitor) {
        this.proto = new ProtoWallet(signer.keyDeriver)
        this.signer = signer
        this.services = services
        this.monitor = monitor

        this.userParty = `user ${signer.getClientChangeKeyPair().publicKey}`
        this.beef = new BeefParty([this.userParty])
        this.trustSelf = 'known'

        if (services) {
            signer.setServices(services)
        }
    }

    async getIdentityKey() : Promise<PubKeyHex> {
        return (await this.getPublicKey({ identityKey: true })).publicKey
    }

    getPublicKey(args: GetPublicKeyArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<GetPublicKeyResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.getPublicKey(args)
    }
    revealCounterpartyKeyLinkage(args: RevealCounterpartyKeyLinkageArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<RevealCounterpartyKeyLinkageResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.revealCounterpartyKeyLinkage(args)
    }
    revealSpecificKeyLinkage(args: RevealSpecificKeyLinkageArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<RevealSpecificKeyLinkageResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.revealSpecificKeyLinkage(args)
    }
    encrypt(args: WalletEncryptArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<WalletEncryptResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.encrypt(args)
    }
    decrypt(args: WalletDecryptArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<WalletDecryptResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.decrypt(args)
    }
    createHmac(args: CreateHmacArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<CreateHmacResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.createHmac(args)
    }
    verifyHmac(args: VerifyHmacArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<VerifyHmacResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.verifyHmac(args)
    }
    createSignature(args: CreateSignatureArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<CreateSignatureResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.createSignature(args)
    }
    verifySignature(args: VerifySignatureArgs, originator?: OriginatorDomainNameStringUnder250Bytes): Promise<VerifySignatureResult> {
        if (args.privileged) {
            // TODO
        }
        return this.proto.verifySignature(args)
    }

    getServices(): sdk.WalletServices {
        if (!this.services)
            throw new sdk.WERR_INVALID_PARAMETER('services', 'valid in constructor arguments to be retreived here.')
        return this.services
    }

    /**
     * @returns the full list of txids whose validity this wallet claims to know.
     * 
     * @param newKnownTxids Optional. Additional new txids known to be valid by the caller to be merged.
     */
    getKnownTxids(newKnownTxids?: string[]): string[] {
        if (newKnownTxids) {
            for (const txid of newKnownTxids) this.beef.mergeTxidOnly(txid)
        }
        const r = this.beef.sortTxs()
        const knownTxids = r.valid.concat(r.txidOnly)
        return knownTxids
    }

    //////////////////
    // List Methods
    //////////////////

    async listActions(args: ListActionsArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<ListActionsResult> {
        sdk.validateOriginator(originator)
        sdk.validateListActionsArgs(args)
        const r = await this.signer.listActions(args)
        return r
    }

    get storageParty(): string { return `storage ${this.signer.getStorageIdentity().storageIdentityKey}` }

    async listOutputs(args: ListOutputsArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<ListOutputsResult> {
        sdk.validateOriginator(originator)
        sdk.validateListOutputsArgs(args)
        const knownTxids = this.getKnownTxids()
        const r = await this.signer.listOutputs(args, knownTxids)
        if (r.BEEF) {
            this.beef.mergeBeefFromParty(this.storageParty, r.BEEF)
        }
        return r
    }

    async listCertificates(args: ListCertificatesArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<ListCertificatesResult> {
        sdk.validateOriginator(originator)
        sdk.validateListCertificatesArgs(args)
        const r = await this.signer.listCertificates(args)
        return r
    }

    //////////////////
    // Certificates
    //////////////////

    async acquireCertificate(args: AcquireCertificateArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<AcquireCertificateResult> {
        sdk.validateOriginator(originator)
        if (args.acquisitionProtocol === 'direct') {
            const vargs = sdk.validateAcquireDirectCertificateArgs(args)
            vargs.subject = (await this.getPublicKey({ identityKey: true, privileged: args.privileged, privilegedReason: args.privilegedReason })).publicKey
            try {
                // Confirm that the information received adds up to a usable certificate...
                await sdk.CertOps.fromCounterparty(this, {
                    certificate: { ...vargs },
                    keyring: vargs.keyringForSubject,
                    counterparty: vargs.keyringRevealer === 'certifier' ? vargs.certifier : vargs.keyringRevealer
                })
            } catch (eu: unknown) {
                const e = sdk.WalletError.fromUnknown(eu)
                throw new sdk.WERR_INVALID_PARAMETER('args', `valid encrypted and signed certificate and keyring from revealer. ${e.name}: ${e.message}`);
            }

            const r = await this.signer.acquireDirectCertificate(args)
            return r
        }

        if (args.acquisitionProtocol === 'issuance') {
            const vargs = await sdk.validateAcquireCertificateArgs(args)
            throw new sdk.WERR_NOT_IMPLEMENTED()
        }

        throw new sdk.WERR_INVALID_PARAMETER('acquisitionProtocol', `valid. ${args.acquisitionProtocol} is unrecognized.`)
    }

    async relinquishCertificate(args: RelinquishCertificateArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<RelinquishCertificateResult> {
        sdk.validateOriginator(originator)
        sdk.validateRelinquishCertificateArgs(args)
        const r = await this.signer.relinquishCertificate(args)
        return r
    }

    async proveCertificate(args: ProveCertificateArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<ProveCertificateResult> {
        originator = sdk.validateOriginator(originator)
        sdk.validateProveCertificateArgs(args)
        const r = await this.signer.proveCertificate(args)
        return r
    }

    async discoverByIdentityKey(args: DiscoverByIdentityKeyArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<DiscoverCertificatesResult> {
        sdk.validateOriginator(originator)
        sdk.validateDiscoverByIdentityKeyArgs(args)

        // TODO: Probably does not get dispatched to signer?
        const r = await this.signer.discoverByIdentityKey(args)

        return r
    }

    async discoverByAttributes(args: DiscoverByAttributesArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<DiscoverCertificatesResult> {
        sdk.validateOriginator(originator)
        sdk.validateDiscoverByAttributesArgs(args)

        // TODO: Probably does not get dispatched to signer?
        const r = await this.signer.discoverByAttributes(args)

        return r
    }



    //////////////////
    // Actions
    //////////////////

    async createAction(args: CreateActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<CreateActionResult> {
        sdk.validateOriginator(originator)
        sdk.validateCreateActionArgs(args)

        if (!args.options) args.options = {}
        args.options.trustSelf ||= this.trustSelf
        args.options.knownTxids = this.getKnownTxids(args.options.knownTxids)

        const r = await this.signer.createAction(args)

        if (r.signableTransaction) {
            const st = r.signableTransaction
            const ab = Beef.fromBinary(st.tx)
            if (!ab.atomicTxid)
                throw new sdk.WERR_INTERNAL('Missing atomicTxid in signableTransaction result')
            if (ab.txs.length < 1 || ab.txs[ab.txs.length - 1].txid !== ab.atomicTxid)
                throw new sdk.WERR_INTERNAL('atomicTxid does not match txid of last AtomicBEEF transaction')
            // Remove the new, partially constructed transaction from beef as it will never be a valid transaction.
            ab.txs.slice(ab.txs.length - 1)
            this.beef.mergeBeefFromParty(this.storageParty, ab)
        } else if (r.tx) {
            this.beef.mergeBeefFromParty(this.storageParty, r.tx)
        }

        return r
    }

    async signAction(args: SignActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<SignActionResult> {
        sdk.validateOriginator(originator)
        sdk.validateSignActionArgs(args)

        const r = await this.signer.signAction(args)

        return r
    }

    async abortAction(args: AbortActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<AbortActionResult> {
        sdk.validateOriginator(originator)
        const vargs = sdk.validateAbortActionArgs(args)

        const r = await this.signer.abortAction(vargs)

        return r
    }

    async internalizeAction(args: InternalizeActionArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<InternalizeActionResult> {
        sdk.validateOriginator(originator)
        sdk.validateInternalizeActionArgs(args)

        const r = await this.signer.internalizeAction(args)

        return r
    }

    async relinquishOutput(args: RelinquishOutputArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<RelinquishOutputResult> {
        sdk.validateOriginator(originator)
        sdk.validateRelinquishOutputArgs(args)

        const r = await this.signer.relinquishOutput(args)

        return r
    }


    async isAuthenticated(args: {}, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<AuthenticatedResult> {
        sdk.validateOriginator(originator)
        const r: { authenticated: true; } = {
            authenticated: true
        }
        return r
    }

    async waitForAuthentication(args: {}, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<AuthenticatedResult> {
        sdk.validateOriginator(originator)
        return { authenticated: true }
    }

    async getHeight(args: {}, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<GetHeightResult> {
        sdk.validateOriginator(originator)
        const height = await this.getServices().getHeight()
        return { height }
    }

    async getHeaderForHeight(args: GetHeaderArgs, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<GetHeaderResult> {
        sdk.validateOriginator(originator)
        const serializedHeader = await this.getServices().getHeaderForHeight(args.height)
        return { header: Utils.toHex(serializedHeader) }
    }

    async getNetwork(args: {}, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<GetNetworkResult> {
        sdk.validateOriginator(originator)
        const chain = await this.signer.getChain()
        return { network: toWalletNetwork(chain) }
    }

    async getVersion(args: {}, originator?: OriginatorDomainNameStringUnder250Bytes)
        : Promise<GetVersionResult> {
        sdk.validateOriginator(originator)
        return { version: 'wallet-brc100-1.0.0' }
    }
}