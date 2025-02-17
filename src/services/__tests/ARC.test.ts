import { _tu } from '../../../test/utils/TestUtilsWalletStorage'
import { sdk, wait } from '../../index.client'
import ARC from '../providers/ARC'
import { BeefTx } from '@bsv/sdk'
import { arcDefaultUrl } from '../createDefaultWalletServicesOptions'

describe('ARC tests', () => {
  jest.setTimeout(99999999)

  const envTest = _tu.getEnv('test')
  const arcTest = new ARC(arcDefaultUrl(envTest.chain), {
    apiKey: envTest.taalApiKey
  })

  const envMain = _tu.getEnv('main')
  const arcMain = new ARC(arcDefaultUrl(envMain.chain), {
    apiKey: envMain.taalApiKey
  })

  test.skip('7 postRawTx testnet', async () => {
    await postRawTxTest('test', arcTest)
  })

  test.skip('8 postRawTx mainnet', async () => {
    await postRawTxTest('main', arcMain)
  })

  test.skip('9 postBeef testnet', async () => {
    const r = await postBeefTest('test', arcTest)
    console.log(`9 postBeef testnet done ${r}`)
  })

  test.skip('10 postBeef mainnet', async () => {
    const r = await postBeefTest('main', arcMain)
    console.log(`10 postBeef mainnet done ${r}`)
  })
})

async function postBeefTest(chain: sdk.Chain, arc: ARC): Promise<string> {
  if (_tu.noEnv(chain)) return 'skipped'
  const c = await _tu.createNoSendTxPair(chain)

  const txids = [c.txidDo, c.txidUndo]

  const r = await arc.postBeef(c.beef, txids)
  expect(r.status).toBe('success')
  for (const txid of txids) {
    const tr = r.txidResults.find(tx => tx.txid === txid)
    expect(tr).not.toBeUndefined()
    expect(tr!.status).toBe('success')
  }

  // replace Undo transaction with double spend transaction and send again.
  const beef2 = c.beef.clone()
  beef2.txs[beef2.txs.length - 1] = BeefTx.fromTx(c.doubleSpendTx)
  const txids2 = [c.txidDo, c.doubleSpendTx.id('hex')]

  const r2 = await arc.postBeef(beef2, txids2)
  expect(r2.status).toBe('error')
  for (const txid of txids2) {
    const tr = r2.txidResults.find(tx => tx.txid === txid)
    expect(tr).not.toBeUndefined()
    if (txid === c.txidDo) {
      expect(tr!.status).toBe('success')
    } else {
      expect(tr!.status).toBe('error')
      expect(tr!.doubleSpend).toBe(true)
      expect(tr!.competingTxs).toEqual([c.txidUndo])
    }
  }
  return 'passed'
}

async function postRawTxTest(chain: sdk.Chain, arc: ARC): Promise<void> {
  if (_tu.noEnv(chain)) return
  const c = await _tu.createNoSendTxPair(chain)

  const rawTxDo = c.beef.findTxid(c.txidDo)!.tx!.toHex()
  const rawTxUndo = c.beef.findTxid(c.txidUndo)!.tx!.toHex()

  const rDo = await arc.postRawTx(rawTxDo)
  expect(rDo.status).toBe('success')
  expect(rDo.txid).toBe(c.txidDo)

  await wait(1000)

  const rUndo = await arc.postRawTx(rawTxUndo)
  expect(rUndo.status).toBe('success')
  expect(rUndo.txid).toBe(c.txidUndo)
  expect(rUndo.doubleSpend).not.toBe(true)

  await wait(1000)

  {
    // Send same transaction again...
    const rUndo = await arc.postRawTx(rawTxUndo)
    expect(rUndo.status).toBe('success')
    expect(rUndo.txid).toBe(c.txidUndo)
    expect(rUndo.doubleSpend).not.toBe(true)
  }

  await wait(1000)

  // Confirm double spend detection.
  const rDouble = await arc.postRawTx(c.doubleSpendTx.toHex())
  expect(rDouble.status).toBe('error')
  expect(rDouble.doubleSpend).toBe(true)
  expect(rDouble.competingTxs![0]).toBe(c.txidUndo)
}
