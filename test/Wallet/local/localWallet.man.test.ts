import {
  Beef,
  CreateActionArgs,
  CreateActionOptions,
  CreateActionResult,
  P2PKH,
  PrivateKey,
  PublicKey,
  Script,
  SignActionArgs
} from '@bsv/sdk'
import { EntityProvenTxReq, Monitor, sdk, Setup, wait } from '../../../src'
import { _tu, TestWalletNoSetup } from '../../utils/TestUtilsWalletStorage'
import { monitorEventLoopDelay } from 'perf_hooks'

describe('localWallet tests', () => {
  jest.setTimeout(99999999)

  test('00', () => {})
  if (_tu.noTestEnv('test')) return
  if (_tu.noTestEnv('main')) return

  test('0 create 1 sat delayed', async () => {
    const setup = await createSetup('test')

    const car = await createOneSatTestOutput(setup, {}, 1)

    await trackReqByTxid(setup, car.txid!)

    await setup.wallet.destroy()
  })

  test('0a create 1 sat immediate', async () => {
    const setup = await createSetup('test')

    const car = await createOneSatTestOutput(
      setup,
      { acceptDelayedBroadcast: false },
      1
    )

    await trackReqByTxid(setup, car.txid!)

    await setup.wallet.destroy()
  })

  test('1 recover 1 sat outputs', async () => {
    const setup = await createSetup('test')

    await recoverOneSatTestOutputs(setup)

    await setup.wallet.destroy()
  })

  test('2 monitor runOnce', async () => {
    const setup = await createSetup('test')

    await setup.monitor.runOnce()

    await setup.wallet.destroy()
  })

  test('3 return active to cloud client', async () => {
    const setup = await createSetup('test')

    const localBalance = await setup.wallet.balance()

    const log = await setup.storage.setActive(setup.clientStorageIdentityKey!)
    console.log(log)

    console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

    const clientBalance = await setup.wallet.balance()

    expect(localBalance.total).toBe(clientBalance.total)

    await setup.wallet.destroy()
  })
})

async function createSetup(chain: sdk.Chain): Promise<TestWalletNoSetup> {
  const env = _tu.getEnv(chain)
  if (!env.testIdentityKey)
    throw new sdk.WERR_INVALID_PARAMETER('env.testIdentityKey', 'valid')
  if (!env.testFilePath)
    throw new sdk.WERR_INVALID_PARAMETER('env.testFilePath', 'valid')

  const setup = await _tu.createTestWallet({
    chain,
    rootKeyHex: env.devKeys[env.testIdentityKey],
    filePath: env.testFilePath,
    setActiveClient: false,
    addLocalBackup: false
  })

  console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

  return setup
}

async function createOneSatTestOutput(
  setup: TestWalletNoSetup,
  options: CreateActionOptions = {},
  howMany: number = 1
): Promise<CreateActionResult> {
  let car: CreateActionResult = {}

  for (let i = 0; i < howMany; i++) {
    const args: CreateActionArgs = {
      outputs: [
        {
          lockingScript: new P2PKH()
            .lock(PublicKey.fromString(setup.identityKey).toAddress())
            .toHex(),
          satoshis: 1,
          outputDescription: 'test output',
          customInstructions: JSON.stringify({
            type: 'P2PKH',
            key: 'identity'
          }),
          basket: 'test-output'
        }
      ],
      description: 'create test output',
      options: {
        ...options
      }
    }
    car = await setup.wallet.createAction(args)
    expect(car.txid)

    const req = await EntityProvenTxReq.fromStorageTxid(
      setup.activeStorage,
      car.txid!
    )
    expect(req !== undefined && req.history.notes !== undefined)
    if (req && req.history.notes) {
      expect(req.status === 'unsent')
      expect(req.history.notes.length === 1)
      const n = req.history.notes[0]
      expect(n.what === 'status' && n.status_now === 'unsent')
    }
  }
  return car
}

async function recoverOneSatTestOutputs(
  setup: TestWalletNoSetup
): Promise<void> {
  const outputs = await setup.wallet.listOutputs({
    basket: 'test-output',
    include: 'entire transactions',
    limit: 1000
  })

  if (outputs.outputs.length > 8) {
    const args: CreateActionArgs = {
      inputBEEF: outputs.BEEF!,
      inputs: [],
      description: 'recover test output'
    }
    const p2pkh = new P2PKH()
    for (const o of outputs.outputs) {
      args.inputs!.push({
        unlockingScriptLength: 108,
        outpoint: o.outpoint,
        inputDescription: 'recovered test output'
      })
    }
    const car = await setup.wallet.createAction(args)
    expect(car.signableTransaction)

    const st = car.signableTransaction!
    const beef = Beef.fromBinary(st.tx)
    const tx = beef.findAtomicTransaction(beef.txs.slice(-1)[0].txid)!
    const signArgs: SignActionArgs = {
      reference: st.reference,
      spends: {} //  0: { unlockingScript } },
    }
    for (let i = 0; i < outputs.outputs.length; i++) {
      const o = outputs.outputs[i]
      const unlock = p2pkh.unlock(setup.keyDeriver.rootKey, 'all', false)
      const unlockingScript = (await unlock.sign(tx, i)).toHex()
      signArgs.spends[i] = { unlockingScript }
    }
    const sar = await setup.wallet.signAction(signArgs)
    expect(sar.txid)
  }
}

async function trackReqByTxid(
  setup: TestWalletNoSetup,
  txid: string
): Promise<void> {
  const req = await EntityProvenTxReq.fromStorageTxid(setup.activeStorage, txid)

  expect(req !== undefined && req.history.notes !== undefined)
  if (!req || !req.history.notes) throw new sdk.WERR_INTERNAL()

  let newBlocks = 0
  let lastHeight: number | undefined
  for (; req.status !== 'completed'; ) {
    let height = setup.monitor.lastNewHeader?.height
    if (req.status === 'unsent') {
      // send it...
    }
    if (req.status === 'sending') {
      // send it...
    }
    if (req.status === 'unmined') {
      if (height && lastHeight) {
        if (height === lastHeight) {
          await wait(1000 * 60)
        } else {
          newBlocks++
          expect(newBlocks < 5)
        }
      }
    }

    await setup.monitor.runOnce()
    await req.refreshFromStorage(setup.activeStorage)
    lastHeight = height
  }
}
