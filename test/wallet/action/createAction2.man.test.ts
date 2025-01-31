import { CreateActionArgs, CreateActionResult } from '@bsv/sdk'
import {
  _tu,
  logTransaction,
  TestWalletNoSetup
} from '../../utils/TestUtilsWalletStorage'
import { StorageGetBeefOptions } from '../../../src/sdk'

const noLog = true

describe('createAction nosend transactions', () => {
  jest.setTimeout(99999999)

  let ctxs: TestWalletNoSetup[] = []
  const env = _tu.getEnv('test')
  const testName = () => expect.getState().currentTestName ?? 'test'

  beforeEach(async () => {
    ctxs = []

    if (env.runMySQL) {
      ctxs.push(await _tu.createLegacyWalletMySQLCopy(testName()))
    }

    ctxs.push(await _tu.createLegacyWalletSQLiteCopy(testName()))
  })

  afterEach(async () => {
    await Promise.all(
      ctxs.map(async ctx => {
        await ctx.storage.destroy()
      })
    )
    ctxs = []
  })

  test('1_transaction with multiple outputs', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 2,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Output 1',
            tags: ['Multiple outputs transaction - Output 2']
          },
          {
            satoshis: 3,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Output 2',
            tags: ['Multiple outputs transaction - Output 1']
          }
        ],
        labels: ['Multiple outputs transaction'],
        description: 'Multiple outputs transaction',
        options: { noSend: true }
      }
      const result: CreateActionResult = await wallet.createAction(args)
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeUndefined()
      if (!noLog) log(await logTransaction(storage, result.txid!))
    }
  })

  test('2_transaction with explicit change check', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      // Funding UTXO transaction has to be dynamically created
      const fundingOutputSatoshis = 4
      const fundingArgs: CreateActionArgs = {
        outputs: [
          {
            satoshis: fundingOutputSatoshis,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Funding Output'
          }
        ],
        description: 'Funding transaction',
        options: { noSend: true }
      }

      const fundingResult: CreateActionResult =
        await wallet.createAction(fundingArgs)
      expect(fundingResult.tx).toBeDefined()
      expect(fundingResult.signableTransaction).toBeUndefined()

      if (!noLog) log(await logTransaction(storage, fundingResult.txid!))

      const inputTxid = fundingResult.txid!
      const inputVout = 0

      const inputs = await storage.findOutputs({
        partial: { txid: inputTxid, vout: inputVout }
      })

      expect(inputs.length).toBeGreaterThan(0)
      const fundingUtxo = inputs[0]
      const inputSatoshis = fundingUtxo.satoshis

      log(
        `Funding UTXO: ${inputTxid}.${inputVout} with ${inputSatoshis} satoshis\n`
      )

      // Define spending transaction
      const outputSatoshis = 2
      const estimatedFee = 1
      const expectedChange = inputSatoshis - outputSatoshis - estimatedFee

      // Retrieve inputBEEF
      const options: StorageGetBeefOptions = { ignoreServices: true }
      const beef = await storage.getBeefForTransaction(inputTxid, options)
      expect(beef).toBeDefined()

      // Create the spending transaction using funding UTXO
      const spendingArgs: CreateActionArgs = {
        inputs: [
          {
            outpoint: `${inputTxid}.${inputVout}`,
            unlockingScript: '47304402207f2e9a',
            inputDescription: 'desc3'
          }
        ],
        outputs: [
          {
            satoshis: outputSatoshis,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Output C'
          }
        ],
        description: 'Explicit check on returned change',
        inputBEEF: beef.toBinary(),
        options: {
          noSend: true,
          noSendChange: [] // Forces wallet to return change
        }
      }

      const spendingResult: CreateActionResult =
        await wallet.createAction(spendingArgs)
      expect(spendingResult.tx).toBeDefined()
      expect(spendingResult.signableTransaction).toBeUndefined()

      log(`Spending transaction: ${spendingResult.txid}\n`)

      // Retrieve the spending transaction from storage to perform assert check
      const transactionsAfter = await storage.findTransactions({
        partial: { txid: spendingResult.txid! }
      })
      expect(transactionsAfter.length).toBeGreaterThan(0)
      const transaction = transactionsAfter[0]
      expect(transaction).toBeDefined()
      expect(transaction.status).toBe('nosend')
      expect(transaction.description).toBe('Explicit check on returned change')

      // Retrieve outputs
      const outputs = await storage.findOutputs({
        partial: { transactionId: transaction.transactionId }
      })
      expect(outputs.length).toBeGreaterThan(0)

      // Validate the actual spending output
      const actualOutput = outputs.find(o => o.satoshis === outputSatoshis)
      expect(actualOutput).toBeDefined()
      expect(actualOutput!.satoshis).toBe(outputSatoshis)
      expect(actualOutput!.change).toBe(false)

      // Validate change output
      const changeOutput = outputs.find(output => output.change)

      // Ensure change exists and is correct
      expect(changeOutput).toBeDefined()
      expect(changeOutput!.satoshis).toBe(expectedChange)

      log(`Received change output: ${changeOutput!.satoshis} satoshis\n`)

      // Validate transaction fee
      const actualFee = inputSatoshis - outputSatoshis - changeOutput!.satoshis
      expect(actualFee).toBe(estimatedFee)

      log(`Calculated transaction fee: ${actualFee} satoshis\n`)

      // Check BEEF data is valid
      const beefData = await storage.getBeefForTransaction(
        spendingResult.txid!,
        options
      )
      expect(beefData).toBeDefined()
      expect(beefData.toLogString()).toContain('BEEF with')

      if (!noLog) log(await logTransaction(storage, spendingResult.txid!))
    }
  })

  /* WIP
  test('3_basic no-send transaction', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 2,
            lockingScript: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
            outputDescription: 'Valid output description'
          }
        ],
        description: 'Valid transaction',
        options: {
          returnTXIDOnly: false,
          randomizeOutputs: false,
          noSend: true
        }
      }
      const result: CreateActionResult = await wallet.createAction(args)
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeUndefined()
      if (!noLog) log(await logTransaction(storage, result.txid!))
    }
  })

  test('4_no-send transaction with multiple inputs and outputs', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        inputs: [
          {
            outpoint: 'tx1.0',
            unlockingScript: '47304402207f2e9a',
            inputDescription: 'desc1'
          },
          {
            outpoint: 'tx2.1',
            unlockingScript: '4730440220abcd',
            inputDescription: 'desc2'
          }
        ],
        outputs: [
          {
            satoshis: 3,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Valid output'
          }
        ],
        description: 'Valid transaction',
        options: {
          returnTXIDOnly: false,
          randomizeOutputs: false,
          //knownTxids: ['tx1', 'tx2'],
          noSend: true
        }
      }
      const result: CreateActionResult = await wallet.createAction(args)
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeUndefined()
      if (!noLog) log(await logTransaction(storage, result.txid!))
    }
  })

  test('5_no-send transaction with zero satoshis output', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 0,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Invalid output'
          }
        ],
        description: 'Valid transaction',
        options: {
          returnTXIDOnly: false,
          randomizeOutputs: false,
          noSend: true
        }
      }
      const result: CreateActionResult = await wallet.createAction(args)
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeUndefined()
      if (!noLog) log(await logTransaction(storage, result.txid!))
    }
  })

  test('6_no-send transaction with custom options', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 4,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Valid output'
          }
        ],
        description: 'Valid transaction',
        options: {
          trustSelf: 'known',
          knownTxids: ['tx123', 'tx456'],
          returnTXIDOnly: false,
          randomizeOutputs: false,
          noSend: true
        }
      }
      const result: CreateActionResult = await wallet.createAction(args)
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeUndefined()
      if (!noLog) log(await logTransaction(storage, result.txid!))
    }
  })

  test('7_no-send transaction without auth (should fail)', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 5,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Valid output'
          }
        ],
        description: 'Valid transaction',
        options: {
          returnTXIDOnly: false,
          randomizeOutputs: false,
          noSend: true
        }
      }
      await expect(wallet.createAction(args, undefined)).rejects.toThrow()
    }
  })

  test('8_no-send transaction with malformed args (invalid destination)', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 6,
            lockingScript: 'invalid_script',
            outputDescription: 'Valid output'
          }
        ],
        description: 'Valid transaction',
        options: {
          noSend: true
        }
      }
      await expect(wallet.createAction(args)).rejects.toThrow()
    }
  })

  test('9_atomicBEEF validity check (ensures atomicTxid is correct)', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 7,
            lockingScript: '76a91489abcdefabbaabbaabbaabbaabbaabbaabbaabba88ac',
            outputDescription: 'Valid output'
          }
        ],
        description: 'Valid transaction'
      }
      const result: CreateActionResult = await wallet.createAction(args)
      if (!noLog) log(await logTransaction(storage, result.txid!))
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeDefined()

      // Validate atomicBEEF structure
      const st = result.signableTransaction!
      const ab = Beef.fromBinary(st.tx)
      expect(ab.atomicTxid).toBeDefined()
      expect(ab.txs.length).toBeGreaterThan(0)
      expect(ab.txs[ab.txs.length - 1].txid).toEqual(ab.atomicTxid)
    }
  })

  test('10_transaction with OP_RETURN', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 0,
            lockingScript: '6a0c48656c6c6f20576f726c64',
            outputDescription: 'OP_RETURN data'
          }
        ],
        description: 'Transaction embedding OP_RETURN data',
        options: { noSend: true }
      }
      const result: CreateActionResult = await wallet.createAction(args)
      expect(result.tx).toBeDefined()
      expect(result.signableTransaction).toBeUndefined()
      if (!noLog) log(await logTransaction(storage, result.txid!))
    }
  })

  test('11_high fee transaction', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        inputs: [
          {
            outpoint: 'tx4.0',
            unlockingScript: '47304402207f2e9a',
            inputDescription: 'desc4'
          }
        ],
        outputs: [
          {
            satoshis: 950,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Output D'
          }
        ],
        description:
          'Transaction that results in high fees (insufficient change)',
        options: { noSend: true }
      }
      await expect(wallet.createAction(args)).rejects.toThrow(
        /WERR_INSUFFICIENT_FUNDS/
      )
    }
  })

  test('12_zero fee transaction', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        inputs: [
          {
            outpoint: 'tx5.0',
            unlockingScript: '47304402207f2e9a',
            inputDescription: 'desc5'
          }
        ],
        outputs: [
          {
            satoshis: 500,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Output E'
          }
        ],
        description: 'Zero-fee transaction attempt',
        options: { noSend: true }
      }
      await expect(wallet.createAction(args)).rejects.toThrow(
        /WERR_INSUFFICIENT_FUNDS/
      )
    }
  })

  test('13_dust transaction', async () => {
    for (const { wallet, activeStorage: storage } of ctxs) {
      const args: CreateActionArgs = {
        outputs: [
          {
            satoshis: 1,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Dust output'
          }
        ],
        description: 'Transaction with dust output',
        options: { noSend: true }
      }
      await expect(wallet.createAction(args)).rejects.toThrow(
        /WERR_INVALID_PARAMETER/
      )
    }
  })
  */
})

function log(s: string) {
  if (!noLog) process.stdout.write(s)
}
