import { Beef, CreateActionArgs, P2PKH, PrivateKey, PublicKey, Script, SignActionArgs } from '@bsv/sdk'
import { EntityProvenTxReq, sdk, Setup } from '../../../src'
import { _tu } from '../../utils/TestUtilsWalletStorage'

describe('localWallet tests', () => {
  jest.setTimeout(99999999)

  test('0 create 1 sat delayed output monitor runOnce', async () => {
    const chain: sdk.Chain = 'test'
    if (_tu.noTestEnv(chain)) return
    const env = _tu.getEnv(chain)
    if (!env.testIdentityKey) throw new sdk.WERR_INVALID_PARAMETER('env.testIdentityKey', 'valid')
    if (!env.testFilePath) throw new sdk.WERR_INVALID_PARAMETER('env.testFilePath', 'valid')

    const setup = await _tu.createTestWallet({
      chain,
      rootKeyHex: env.devKeys[env.testIdentityKey],
      filePath: env.testFilePath,
      setActiveClient: false,
      addLocalBackup: false
    })

    console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

    const args: CreateActionArgs = {
      outputs: [
        {
          lockingScript: new P2PKH().lock(PublicKey.fromString(setup.identityKey).toAddress()).toHex(),
          satoshis: 1,
          outputDescription: 'test output',
          customInstructions: JSON.stringify({ type: 'P2PKH', key: 'identity' }),
          basket: 'test-output'
        }
      ],
      description: 'create test output'
    }
    const car = await setup.wallet.createAction(args)
    expect(car.txid)

    let req = await EntityProvenTxReq.fromStorageTxid(setup.activeStorage, car.txid!)
    expect(req !== undefined && req.history.notes !== undefined)
    if (req && req.history.notes) {
      expect(req.status === 'unsent')
      expect(req.history.notes.length === 1)
      const n = req.history.notes[0]
      expect(n.what === 'status' && n.status_now === 'unsent')
    }

    await setup.monitor.runOnce()

    req = await EntityProvenTxReq.fromStorageTxid(setup.activeStorage, car.txid!)
    expect(req !== undefined && req.history.notes !== undefined)
    if (req && req.history.notes) {
      expect(req.status === 'unmined')
      expect(req.history.notes.length === 1)
      const n = req.history.notes[0]
      expect(n.what === 'status' && n.status_now === 'unsent')
    }


    await setup.wallet.destroy()
  })

  test('1 recover 1 sat outputs', async () => {
    const chain: sdk.Chain = 'test'
    if (_tu.noTestEnv(chain)) return
    const env = _tu.getEnv(chain)
    if (!env.testIdentityKey) throw new sdk.WERR_INVALID_PARAMETER('env.testIdentityKey', 'valid')
    if (!env.testFilePath) throw new sdk.WERR_INVALID_PARAMETER('env.testFilePath', 'valid')

    const setup = await _tu.createTestWallet({
      chain,
      rootKeyHex: env.devKeys[env.testIdentityKey],
      filePath: env.testFilePath,
      setActiveClient: false,
      addLocalBackup: false
    })

    console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

    const outputs = await setup.wallet.listOutputs({
      basket: 'test-output',
      include: 'entire transactions',
      limit: 1000
    })

    if (outputs.outputs.length > 8) {
      const args: CreateActionArgs = {
        inputBEEF: outputs.BEEF!,
        inputs: [],
        description: 'recover test output',
      }
      const p2pkh = new P2PKH()
      for (const o of outputs.outputs) {
        args.inputs!.push({
          unlockingScriptLength: 108,
          outpoint: o.outpoint,
          inputDescription: 'recovered test output',
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

    await setup.wallet.destroy()
  })

  test('2 monitor runOnce', async () => {
    const chain: sdk.Chain = 'test'
    if (_tu.noTestEnv(chain)) return
    const env = _tu.getEnv(chain)
    if (!env.testIdentityKey) throw new sdk.WERR_INVALID_PARAMETER('env.testIdentityKey', 'valid')
    if (!env.testFilePath) throw new sdk.WERR_INVALID_PARAMETER('env.testFilePath', 'valid')

    const setup = await _tu.createTestWallet({
      chain,
      rootKeyHex: env.devKeys[env.testIdentityKey],
      filePath: env.testFilePath,
      setActiveClient: false,
      addLocalBackup: false
    })

    console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

    await setup.monitor.runOnce()

    await setup.wallet.destroy()
  })

  test('3 return active to cloud client', async () => {
    const chain: sdk.Chain = 'test'
    if (_tu.noTestEnv(chain)) return
    const env = _tu.getEnv(chain)
    if (!env.testIdentityKey) throw new sdk.WERR_INVALID_PARAMETER('env.testIdentityKey', 'valid')
    if (!env.testFilePath) throw new sdk.WERR_INVALID_PARAMETER('env.testFilePath', 'valid')

    const setup = await _tu.createTestWallet({
      chain,
      rootKeyHex: env.devKeys[env.testIdentityKey],
      filePath: env.testFilePath,
      setActiveClient: true,
      addLocalBackup: false
    })

    console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

    await setup.wallet.destroy()
  })

})
