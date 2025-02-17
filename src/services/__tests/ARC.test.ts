import { toBase58 } from "@bsv/sdk/dist/types/src/primitives/utils"
import { _tu } from "../../../test/utils/TestUtilsWalletStorage"
import { sdk, wait } from "../../index.client"
import ARC from "../providers/ARC"

describe('ARC tests', () => {
  jest.setTimeout(99999999)

  const envTest = _tu.getEnv('test')
  const arcTest = new ARC(arcUrl(envTest.chain), { apiKey: envTest.taalApiKey })

  const envMain = _tu.getEnv('main')
  const arcMain = new ARC(arcUrl(envMain.chain), { apiKey: envMain.taalApiKey })

  test('7 postRawTx testnet', async () => {
    await postRawTxTest('test', arcTest)
  })

  test('8 postRawTx mainnet', async () => {
    await postRawTxTest('main', arcMain)
  })

})

function arcUrl(chain: sdk.Chain): string {
  const url = chain === 'main'
    ? 'https://api.taal.com/arc'
    : 'https://arc-test.taal.com'
  return url
}

async function postRawTxTest(chain: sdk.Chain, arc: ARC) {
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