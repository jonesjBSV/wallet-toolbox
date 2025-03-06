import { ProveCertificateResult } from '@bsv/sdk'
import { sdk, Wallet } from '../../index.client'
import { CertOpsWallet } from '../../sdk'

export async function proveCertificate(
  wallet: Wallet,
  auth: sdk.AuthId,
  vargs: sdk.ValidProveCertificateArgs
): Promise<ProveCertificateResult> {
  const lcargs: sdk.ValidListCertificatesArgs = {
    partial: {
      type: vargs.type,
      serialNumber: vargs.serialNumber,
      certifier: vargs.certifier,
      subject: vargs.subject,
      revocationOutpoint: vargs.revocationOutpoint,
      signature: vargs.signature
    },
    certifiers: [],
    types: [],
    limit: 2,
    offset: 0,
    privileged: false
  }

  const lcr = await wallet.storage.listCertificates(lcargs)
  if (lcr.certificates.length != 1) throw new sdk.WERR_INVALID_PARAMETER('args', `a unique certificate match`)
  const storageCert = lcr.certificates[0]
  let proveWallet: CertOpsWallet = wallet
  if (storageCert.subject != wallet.identityKey) {
    // Certificate must have been issued to privileged identity
    if (!wallet.privilegedKeyManager)
      throw new sdk.WERR_INVALID_OPERATION('Wallet is not privileged. proveCertificate fails.')
    proveWallet = wallet.privilegedKeyManager
  }
  const co = await sdk.CertOps.fromCounterparty(proveWallet, {
    certificate: { ...storageCert },
    keyring: storageCert.keyring!,
    counterparty: storageCert.verifier || storageCert.subject
  })
  const e = await co.exportForCounterparty(vargs.verifier, vargs.fieldsToReveal)
  const pr: ProveCertificateResult = {
    certificate: e.certificate,
    verifier: e.counterparty,
    keyringForVerifier: e.keyring
  }
  return pr
}
