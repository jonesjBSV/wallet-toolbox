import { Beef, KeyDeriver, P2PKH, PrivateKey, Transaction } from '@bsv/sdk'
import { brc29ProtocolID, sdk } from '../../index.client'
import { _tu } from '../../../test/utils/TestUtilsWalletStorage'
import {
  getRawTxFromWhatsOnChain,
  postRawTxToWhatsOnChain
} from '../providers/whatsonchain'

describe('doubleSpend tests', () => {
  jest.setTimeout(99999999)

  test('0 doubleSpend', async () => {
    const env = _tu.getEnv('main')
    const tx = await txThatDoubleSpends('main')
    const txid = tx.id('hex')
    console.log(txid)
    const pr = await postRawTxToWhatsOnChain(
      'main',
      tx.toHex(),
      env.mainTaalApiKey
    )
    expect(pr.status === 200)
    expect(pr.statusText === 'OK')

    const gr2 = await getRawTxFromWhatsOnChain(
      'a2d12c318cc46935b321f3199cc4e9eafd39e8ca6e73cc33d182f7ff64ffab19',
      env.chain
    )
    const gr = await getRawTxFromWhatsOnChain(txid, env.chain)
  })
})

async function lookupInputBeef(): Promise<void> {
  const env = _tu.getEnv('main')

  const setup = await _tu.createMySQLTestWallet({
    databaseName: 'productiondojotone',
    chain: 'main',
    rootKeyHex: env.devKeys[env.identityKey]
  })

  const inputBeef = await setup.activeStorage.getBeefForTransaction(
    '3ac6d3053ebb5ea2b58f1919b8763db6cfc7c66426f224e4ee2825d11eca3f57',
    {}
  )
  console.log(inputBeef.toLogString())
  console.log(inputBeef.toHex())
}

async function txThatDoubleSpends(chain: sdk.Chain): Promise<Transaction> {
  const env = _tu.getEnv(chain)
  const unlockerKey = env.devKeys[env.identityKey]
  const tx = new Transaction()
  if (chain === 'main') {
    const privKey = privateKeyFromBRC29(
      unlockerKey,
      env.identityKey,
      'U/J368gMuUdPUo1GM22SiA==',
      '47XSW3c61fkKkBbmdloMLg=='
    )
    const sourceTXID =
      '3ac6d3053ebb5ea2b58f1919b8763db6cfc7c66426f224e4ee2825d11eca3f57'
    const sourceOutputIndex = 1
    const sourceSatoshis = 799
    const sourceBeef =
      '0200beef01fedb050d000b02fdb40102573fca1ed12528eee424f22664c6c7cfb63d76b819198fb5a25ebb3e05d3c63afdb5010013307fd7d5c3fa2eede33da11d16b1bbeb207b00fa853248808744a6eeadad6201db00c988d594007e1732286843579d1625e28664a74d30ea34aa9aea6894cca3178c016c0093b39886fc2d228ad9d6afb16ecf3600e6e5fb6b720623594a5b2440997636b601370088f997722ae8396ae6138f328d490aab72bbe3f19b530c2cb4362fd9e1f30802011a0000b753c524041d59e007423d2a65a8c4cd2fe4256615c17270ce5266be71261b010c00b9fc008f80e142b9e4e8c32be033e602660cb859d6f6ab326fa3be86dd694bad0107008957b80a2e3b4ea13050a80da887959d32eec9221e25849dcc459d7a203d215101020015328edfcaae5591af67d7c16f6a3b71f679fb6ea43a83e2381fd09783c8a1cf01000080b74d6415450c2e349ededec4c6b2df8f8c406d6b8f69c4e5e3b063a55c700d010100a599dea74139b96b9ab45a3dcb2d5848e7aaca095bfa7215e5b4a8afc7fa33a6010100289a070585585dafccfb26e05231fce218eef7ef3ee424ebd98093d742d9ea060101000100000001cc87a3d8a14ff50fbb6b6adc070459cc9d622a3dbeb1c9b2fc3988660a9914b8000000004847304402206ea80a7b07a5344b0003bf38431c7329221e3397e05930891324089e11e7bfb502203039e38447a9cd2aea646400defa6c7a8d2da3af044d9bb391115b0d118b0b09c2ffffffff02c8000000000000001976a914aaf18df42fad715c030138bc3bdec2e63939a61488ac1f030000000000001976a914cb428cf87747e20be9ce14dc62337f622d74eda388ac00000000'
    tx.addInput({
      sourceOutputIndex,
      sourceTXID,
      sourceTransaction:
        Beef.fromString(sourceBeef).findAtomicTransaction(sourceTXID),
      unlockingScriptTemplate: new P2PKH().unlock(
        privKey,
        'all',
        false,
        sourceSatoshis
      )
    })
    tx.addOutput({
      satoshis: sourceSatoshis - 10,
      lockingScript: new P2PKH().lock(privKey.toAddress())
    })
  } else {
  }
  await tx.sign()
  return tx
}

function privateKeyFromBRC29(
  unlockerKey: string,
  lockerKey: string,
  prefix: string,
  suffix: string
): PrivateKey {
  const derivedPrivateKey = new KeyDeriver(
    PrivateKey.fromHex(unlockerKey)
  ).derivePrivateKey(brc29ProtocolID, `${prefix} ${suffix}`, lockerKey)
  return derivedPrivateKey
}
