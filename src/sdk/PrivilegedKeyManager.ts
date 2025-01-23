import {
    Random,
    Utils,
    PrivateKey,
    CreateHmacArgs,
    CreateHmacResult,
    CreateSignatureArgs,
    CreateSignatureResult,
    GetPublicKeyArgs,
    ProtoWallet,
    PubKeyHex,
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
    WalletEncryptResult
} from '@bsv/sdk';

/**
 * PrivilegedKeyManager
 *
 * This class manages a privileged (i.e., very sensitive) private key, obtained from
 * an external function (`keyGetter`), which might be backed by HSMs, secure enclaves,
 * or other secure storage. The manager retains the key in memory only for a limited
 * duration (`retentionPeriod`), and uses best-effort obfuscation techniques to keep
 * the raw key material hard to access at runtime.
 *
 * IMPORTANT: While these measures raise the bar for attackers, JavaScript environments
 * do not provide perfect in-memory secrecy.
 */
export class PrivilegedKeyManager {
    /**
     * Function that will retrieve the PrivateKey from a secure environment,
     * e.g., an HSM or secure enclave. The reason for key usage is passed in
     * to help with user consent, auditing, and access policy checks.
     */
    private keyGetter: (reason: string) => Promise<PrivateKey>;

    /**
     * Time (in ms) for which the obfuscated key remains in memory
     * before being automatically destroyed.
     */
    private retentionPeriod: number;

    /**
     * Obfuscated private key bytes. This is ephemeral and destroyed
     * after the retention period. The actual key is never stored in
     * plaintext form here.
     */
    private obfuscatedKey: Uint8Array | undefined;

    /**
     * Random pad used to XOR/un-XOR the private key bytes.
     */
    private obfuscationPad: Uint8Array | undefined;

    /**
     * Handle to the timer that will remove the key from memory
     * after the retention period. If the key is refreshed again
     * within that period, the timer is cleared and re-set.
     */
    private destroyTimer: any | undefined;

    /**
     * @param keyGetter - Asynchronous function that retrieves the PrivateKey from a secure environment.
     * @param retentionPeriod - Time in milliseconds to retain the obfuscated key in memory before zeroizing.
     */
    constructor(keyGetter: (reason: string) => Promise<PrivateKey>, retentionPeriod = 120_000) {
        this.keyGetter = keyGetter;
        this.retentionPeriod = retentionPeriod;
    }

    /**
     * Safely destroys the in-memory obfuscated key material by zeroizing
     * and unsetting related fields.
     */
    private destroyKey(): void {
        if (this.obfuscatedKey) {
            this.obfuscatedKey.fill(0);
            this.obfuscatedKey = undefined;
        }
        if (this.obfuscationPad) {
            this.obfuscationPad.fill(0);
            this.obfuscationPad = undefined;
        }
        if (this.destroyTimer) {
            clearTimeout(this.destroyTimer);
            this.destroyTimer = undefined;
        }
    }

    /**
     * Re/sets the destruction timer that removes the key from memory
     * after `retentionPeriod` ms. If a timer is already running, it
     * is cleared and re-set. This ensures the key remains in memory
     * for exactly the desired window after its most recent acquisition.
     */
    private scheduleKeyDestruction(): void {
        // Clear any existing timer to avoid multiple overlapping timers.
        if (this.destroyTimer) {
            clearTimeout(this.destroyTimer);
        }
        this.destroyTimer = setTimeout(() => {
            this.destroyKey();
        }, this.retentionPeriod);
    }

    /**
     * XOR-based obfuscation. This function takes the raw key bytes
     * and a random pad of identical length, then returns the XOR
     * combination for storage in memory. This is a minimal effort
     * obfuscation that prevents immediate reading of the raw key in
     * memory, but is by no means cryptographically unbreakable if
     * an attacker can read both the obfuscated bytes and the pad.
     *
     * @param keyBytes - Raw key bytes (32 bytes typically).
     * @param padBytes - Random pad bytes of the same length.
     */
    private static xorBytes(keyBytes: Uint8Array, padBytes: Uint8Array): Uint8Array {
        const out = new Uint8Array(keyBytes.length);
        for (let i = 0; i < keyBytes.length; i++) {
            out[i] = keyBytes[i] ^ padBytes[i];
        }
        return out;
    }

    /**
     * Returns the privileged key needed to perform cryptographic operations.
     * Uses an in-memory (obfuscated) cache if it exists; otherwise calls out
     * to the `keyGetter`, obfuscates, and stores the key.
     *
     * The underlying raw key is revealed **only** within this function's local
     * scope and ephemeral variables during usage, after which we zero them out
     * or let them go out of scope. The class only retains the XOR-obfuscated
     * version in memory.
     *
     * @param reason - The reason for why the key is needed, passed to keyGetter.
     * @returns The PrivateKey object needed for cryptographic operations.
     */
    private async getPrivilegedKey(reason: string): Promise<PrivateKey> {
        // If we already have an obfuscated key and pad in memory, just de-obfuscate them.
        if (this.obfuscatedKey && this.obfuscationPad) {
            const rawKeyBytes = PrivilegedKeyManager.xorBytes(this.obfuscatedKey, this.obfuscationPad);
            const hexKey = Utils.toHex([...rawKeyBytes]);
            // Attempt to zero the ephemeral copy of rawKeyBytes. (JS engines can optimize away these writes.)
            rawKeyBytes.fill(0);

            // Re-schedule the destruction timer to keep the key around for another retentionPeriod
            this.scheduleKeyDestruction();

            return new PrivateKey(hexKey, 16);
        }

        // Otherwise, fetch a fresh key from the secure environment:
        const fetchedKey = await this.keyGetter(reason);
        // Convert to raw bytes:
        const keyHex = fetchedKey.toHex();
        const keyBytes = Uint8Array.from(Utils.toArray(keyHex));

        // Obfuscate the key with XOR to store in memory:
        this.obfuscationPad = Uint8Array.from(Random(32));
        this.obfuscatedKey = PrivilegedKeyManager.xorBytes(keyBytes, this.obfuscationPad);

        // Zero out ephemeral variables to reduce risk:
        keyBytes.fill(0);

        // Start or reset the destruction timer:
        this.scheduleKeyDestruction();

        // Return a fresh PrivateKey for the caller to use:
        return fetchedKey;
    }

    async getPublicKey(args: GetPublicKeyArgs): Promise<{ publicKey: PubKeyHex }> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.getPublicKey(args);
    }

    async revealCounterpartyKeyLinkage(
        args: RevealCounterpartyKeyLinkageArgs
    ): Promise<RevealCounterpartyKeyLinkageResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.revealCounterpartyKeyLinkage(args);
    }

    async revealSpecificKeyLinkage(
        args: RevealSpecificKeyLinkageArgs
    ): Promise<RevealSpecificKeyLinkageResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.revealSpecificKeyLinkage(args);
    }

    async encrypt(args: WalletEncryptArgs): Promise<WalletEncryptResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.encrypt(args);
    }

    async decrypt(args: WalletDecryptArgs): Promise<WalletDecryptResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.decrypt(args);
    }

    async createHmac(args: CreateHmacArgs): Promise<CreateHmacResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.createHmac(args);
    }

    async verifyHmac(args: VerifyHmacArgs): Promise<VerifyHmacResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.verifyHmac(args);
    }

    async createSignature(args: CreateSignatureArgs): Promise<CreateSignatureResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.createSignature(args);
    }

    async verifySignature(args: VerifySignatureArgs): Promise<VerifySignatureResult> {
        const p = await this.getPrivilegedKey(args.privilegedReason as string);
        const proto = new ProtoWallet(p);
        return proto.verifySignature(args);
    }
}
