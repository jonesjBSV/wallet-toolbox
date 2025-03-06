import { MasterCertificate, ProveCertificateResult, VerifiableCertificate } from '@bsv/sdk'
import { sdk, Wallet } from '../../index.client'

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
  if (lcr.certificates.length != 1)
    throw new sdk.WERR_INVALID_PARAMETER('args', `a unique certificate match`)
  const storageCert = lcr.certificates[0]
  // if (storageCert.subject != wallet.identityKey) {
  //   // Certificate must have been issued to privileged identity
  //   if (!wallet.privilegedKeyManager)
  //     throw new sdk.WERR_INVALID_OPERATION(
  //       'Wallet is not privileged. proveCertificate fails.'
  //     )
  //   proveWallet = wallet.privilegedKeyManager
  // }

  // TODO: Add support for privileged certificates

  const keyringForVerifier = await MasterCertificate.createKeyringForVerifier(
    wallet,
    storageCert.certifier,
    vargs.verifier,
    storageCert.fields,
    vargs.fieldsToReveal,
    storageCert.keyring!,
    storageCert.serialNumber
  )

  return { keyringForVerifier }
}
