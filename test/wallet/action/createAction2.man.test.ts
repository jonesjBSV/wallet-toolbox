import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import {
  AtomicBEEF,
  Beef,
  CreateActionArgs,
  CreateActionResult,
  ListActionsResult,
  MerklePath,
  Transaction,
  WalletActionInput,
  WalletActionOutput
} from '@bsv/sdk'
import { _tu, TestWalletNoSetup } from '../../utils/TestUtilsWalletStorage'
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
    for (const { wallet } of ctxs) await wallet.destroy()
  })

  test('1_transaction_with_atomicBEEF_check', async () => {
    for (const { wallet } of ctxs) {
      const fundingBasket = 'funding basket'
      const fundingTag = 'funding transaction output'
      const fundingSatoshis = 3
      const fundingLabel = 'funding transaction for createAction'

      const fundingArgs: CreateActionArgs = {
        outputs: [
          {
            basket: fundingBasket,
            tags: [fundingTag, 'test tag'],
            satoshis: fundingSatoshis,
            lockingScript: '76a914abcdef0123456789abcdef0123456789abcdef88ac',
            outputDescription: 'Funding Output'
          }
        ],
        labels: [
          fundingLabel,
          'this is an extra long test label that should be truncated at 80 chars when it is displayed'
        ],
        description: 'Funding transaction',
        options: { noSend: true }
      }

      const fundingResult: CreateActionResult =
        await wallet.createAction(fundingArgs)
      expect(fundingResult.tx).toBeDefined()

      const actionsResult = await wallet.listActions({
        labels: [fundingLabel],
        includeInputs: true,
        includeOutputs: true,
        includeInputSourceLockingScripts: true,
        includeInputUnlockingScripts: true,
        includeOutputLockingScripts: true,
        includeLabels: true
      })

      log(JSON.stringify(actionsResult))

      const beef = Beef.fromBinary(fundingResult.tx!)
      expect(beef).toBeDefined()
      const beefToLogString = beef.toLogString()

      const logFilePath = path.resolve(__dirname, 'createAction2.man.test.ts')
      const testName = expect.getState().currentTestName ?? 'Unknown Test'
      const expectedLogRaw = extractExpectedLogFromComment(
        logFilePath,
        testName
      )

      const rl = await toLogString(fundingResult.tx!, actionsResult)

      if (!expectedLogRaw) {
        console.warn(
          `No commented logs found for test "${testName}". Creating one now.`
        )
        appendLogsAsComment(rl) // Automatically append log as a comment
        return // Skip the comparison since no reference log exists
      }

      const expectedLog = normalizeVariableParts(expectedLogRaw)
      const receivedLog = normalizeVariableParts(rl.log)

      expect(receivedLog).toBe(expectedLog)

      log(beefToLogString)
      log(rl.log)
      log(rl.logColor)

      appendLogsAsComment(rl)
    }
  })

  /* WIP
  test('2_transaction with multiple outputs', async () => {
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
    }
  })

  test('3_transaction with explicit change check', async () => {
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
      //const beef = await storage.getBeefForTransaction(inputTxid, options)
      //expect(beef).toBeDefined()

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
        //inputBEEF: beef.toBinary(),
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

      // expect(beefData).toBeDefined()
      // expect(beefData.toLogString()).toContain('BEEF with')
    }
  })

  test('4_basic no-send transaction', async () => {
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
    }
  })

  test('5_no-send transaction with multiple inputs and outputs', async () => {
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
    }
  })

  test('6_no-send transaction with zero satoshis output', async () => {
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
    }
  })

  test('7_no-send transaction with custom options', async () => {
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
    }
  })

  test('8_no-send transaction without auth (should fail)', async () => {
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

  test('9_no-send transaction with malformed args (invalid destination)', async () => {
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

  test('10_atomicBEEF validity check (ensures atomicTxid is correct)', async () => {
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

  test('11_transaction with OP_RETURN', async () => {
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
    }
  })

  test('12_high fee transaction', async () => {
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

  test('13_zero fee transaction', async () => {
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

  test('14_dust transaction', async () => {
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

// Helper functions
function extractExpectedLogFromComment(
  logFilePath: string,
  testName: string
): string | null {
  const logContent = fs.readFileSync(logFilePath, 'utf8')
  const testNamePattern = testName.replace(/\d+_/, '\\d+_?') // Normalize dynamic numbers
  const regex = new RegExp(
    `// \\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2} \\[.*?${testNamePattern}.*?\\]\\n// (.*?)\\n`,
    's'
  )

  const match = logContent.match(regex)
  if (!match) return null

  let extractedLog = match[1]
  extractedLog = extractedLog.split('###LOGCOLOR###')[0]

  return extractedLog.trim()
}

const normalizeVariableParts = (log: string): string => {
  return log
    .replace(/txid:[a-f0-9]{64}/g, 'txid:PLACEHOLDER') // Replace TXIDs
    .replace(/sourceTXID:[a-f0-9]{64}/g, 'sourceTXID:PLACEHOLDER') // Replace Source TXIDs
    .replace(/seq:\d+/g, 'seq:PLACEHOLDER') // Replace sequence numbers
    .replace(/lock:\(\d+\)[a-f0-9]+/g, 'lock:(...)') // Replace locking script
    .replace(/unlock:\(\d+\)[a-f0-9]+/g, 'unlock:(...)') // Replace unlocking script
    .replace(/\n/g, '\\n') // Explicitly preserve newlines
    .replace(/index:\d+ spendable:/g, 'index:INDEX_PLACEHOLDER spendable:') // Replace index with a placeholder
    .trim()
}

function appendLogsAsComment(rl: any) {
  const timestamp = new Date().toISOString().replace('T', ' ').split('.')[0]
  const testName = expect.getState().currentTestName ?? 'Unknown Test'
  const logFilePath = path.resolve(__dirname, 'createAction2.man.test.ts')

  const formattedLog = rl.log.replace(/\n/g, '\\n')
  const formattedLogColor = rl.logColor.replace(/\n/g, '\\n')

  // Add special sequence ###LOGCOLOR### as a separator
  const logComment = `\n// ${timestamp} [${testName}]\n// ${formattedLog}###LOGCOLOR### \\n ${formattedLogColor}\n`

  fs.appendFileSync(logFilePath, logComment, 'utf8')
}

const truncate = (s: string) => (s.length > 80 ? s.slice(0, 80) + '...' : s)

const formatOptionalField = (fieldName: string, value: any) =>
  value !== undefined && value !== null && value !== ''
    ? ` ${fieldName}:${value}`
    : ''

const formatOptionalFieldWithQuotes = (fieldName: string, value: any) =>
  value !== undefined && value !== null && value !== ''
    ? ` ${fieldName}:'${value}'`
    : ''

const formatOptionalFieldWithColor = (
  fieldName: string,
  value: any,
  colorFunc: (val: string) => string
) =>
  value !== undefined && value !== null && value !== ''
    ? ` ${chalk.gray(fieldName + ':')}${colorFunc(typeof value === 'string' ? value : String(value))}`
    : ''

const formatMetadata = (metadata?: any) =>
  metadata && !isEmptyObject(metadata)
    ? `metadata:${JSON.stringify(metadata)}`
    : ''

const formatMerklePath = (merklePath?: MerklePath | string) =>
  merklePath ? `merklePath:${String(merklePath)}` : ''

const formatInputs = (inputs?: WalletActionInput[]) =>
  inputs && inputs.length > 0
    ? inputs
        .sort((a, b) => a.sourceOutpoint.localeCompare(b.sourceOutpoint)) // Sort by source TXID alphabetically
        .map((input, i) => {
          let line = `${i}: sourceTXID:${input.sourceOutpoint} sats:${input.sourceSatoshis}`
          let color = `${chalk.gray(`${i}:`)} ${chalk.blue(input.sourceOutpoint)} ${chalk.green(`${input.sourceSatoshis} sats`)}`

          line += formatOptionalFieldWithQuotes('desc', input.inputDescription)
          color += formatOptionalFieldWithColor(
            'desc',
            input.inputDescription,
            chalk.white
          )

          if (input.sourceLockingScript) {
            line += ` lock:(${input.sourceLockingScript.length})${input.sourceLockingScript}`
            color += ` ${chalk.gray('lock:')}(${input.sourceLockingScript.length})${chalk.cyan(input.sourceLockingScript)}`
          }

          if (input.unlockingScript) {
            line += ` unlock:(${input.unlockingScript.length})${truncate(input.unlockingScript)}`
            color += ` ${chalk.gray('unlock:')}(${input.unlockingScript.length})${chalk.cyan(truncate(input.unlockingScript))}`
          }

          line += ` seq:${input.sequenceNumber}`
          color += ` ${chalk.gray('seq:')}${input.sequenceNumber}`

          return {
            log: formatIndentedLine(2, line),
            logColor: formatIndentedLine(2, color)
          }
        })
    : [
        {
          log: formatIndentedLine(2, 'No inputs'),
          logColor: formatIndentedLine(2, chalk.gray('No inputs'))
        }
      ]

const formatOutputs = (outputs?: WalletActionOutput[]) =>
  outputs && outputs.length > 0
    ? outputs
        .sort((a, b) => a.satoshis - b.satoshis) // Ensures consistent order
        .map((output, i) => {
          let line = `${i}: sats:${output.satoshis} lock:(${output.lockingScript?.length || ''})${output.lockingScript ?? 'N/A'}`
          let color = `${chalk.gray(`${i}:`)} ${chalk.green(`${output.satoshis} sats`)} ${chalk.gray('lock:')}(${output.lockingScript?.length || ''})${chalk.cyan(output.lockingScript ?? 'N/A')}`

          line += formatOptionalField('index', output.outputIndex)
          color += formatOptionalFieldWithColor(
            'index',
            output.outputIndex,
            chalk.white
          )

          line += formatOptionalField('spendable', output.spendable)
          color += formatOptionalFieldWithColor(
            'spendable',
            output.spendable,
            chalk.white
          )

          line += formatOptionalFieldWithQuotes(
            'custinst',
            output.customInstructions
          )
          color += formatOptionalFieldWithColor(
            'custinst',
            output.customInstructions,
            chalk.white
          )

          line += formatOptionalFieldWithQuotes('basket', output.basket)
          color += formatOptionalFieldWithColor(
            'basket',
            output.basket,
            chalk.white
          )

          line += formatOptionalFieldWithQuotes(
            'desc',
            output.outputDescription
          )
          color += formatOptionalFieldWithColor(
            'desc',
            output.outputDescription,
            chalk.white
          )

          if (output.tags?.length) {
            const tagsString = `[${output.tags.map(tag => `'${truncate(tag)}'`).join(',')}]`
            line += ` tags:${tagsString}`
            color += ` ${chalk.gray('tags:')}${chalk.white(tagsString)}`
          }

          return {
            log: formatIndentedLine(2, line),
            logColor: formatIndentedLine(2, color)
          }
        })
    : [
        {
          log: formatIndentedLine(2, 'No outputs'),
          logColor: formatIndentedLine(2, chalk.gray('No outputs'))
        }
      ]

const formatLabels = (labels?: string[]) =>
  labels && labels.length > 0
    ? `[${labels.map(label => `'${truncate(label)}'`).join(',')}]`
    : ''

export async function toLogString(
  atomicBeef: AtomicBEEF,
  actionsResult?: ListActionsResult,
  showKey: boolean = true
): Promise<{ log: string; logColor: string }> {
  const BEEF_V1 = 4022206465

  try {
    const beef = Beef.fromBinary(atomicBeef)
    beef.version = BEEF_V1

    let log = `transactions:${beef.txs.length}`
    let logColor = chalk.gray(`transactions:${beef.txs.length}`)

    if (showKey) {
      logColor += ` ${chalk.gray(`key:`)} (${chalk.blue('txid/outpoint')} ${chalk.cyan('script')} ${chalk.green('sats')})`
    }

    const mainTxid = beef.txs.slice(-1)[0].txid
    const mainTx: Transaction = beef.findAtomicTransaction(mainTxid)!

    const action = actionsResult?.actions.find(a => a.txid === mainTxid)

    const labelString = formatLabels(action?.labels)
    const metadataString = formatMetadata(mainTx.metadata)
    const merklePathString = formatMerklePath(mainTx.merklePath)

    log += `\n${formatIndentedLine(1, `txid:${mainTxid} version:${mainTx.version} lockTime:${mainTx.lockTime}${formatOptionalField('sats', action?.satoshis)}${formatOptionalField('status', action?.status)}${formatOptionalField('outgoing', action?.isOutgoing)}${formatOptionalFieldWithQuotes('desc', action?.description)}${metadataString}${merklePathString} labels:${labelString}`)}`

    logColor += `\n${formatIndentedLine(
      1,
      [
        chalk.blue(mainTxid),
        ` ${chalk.gray('version:')}${mainTx.version}`,
        ` ${chalk.gray('lockTime:')}${mainTx.lockTime}`,
        ` ${chalk.green(`${action?.satoshis} sats`)}`,
        formatOptionalFieldWithColor('status', action?.status, chalk.white),
        formatOptionalFieldWithColor(
          'outgoing',
          action?.isOutgoing,
          chalk.white
        ),
        formatOptionalFieldWithColor('desc', action?.description, chalk.white),
        metadataString ? chalk.gray(metadataString) : '',
        merklePathString ? chalk.gray(merklePathString) : '',
        ` ${chalk.gray('labels:')}${chalk.white(labelString)}`
      ]
        .filter(Boolean)
        .join('')
    )}`

    log += `\n${formatIndentedLine(1, `inputs: ${action?.inputs?.length ?? 0}`)}`
    logColor += `\n${formatIndentedLine(1, chalk.gray(`inputs: ${action?.inputs?.length ?? 0}`))}`

    const sortedInputs = (action?.inputs ?? []).sort((a, b) =>
      a.sourceOutpoint.localeCompare(b.sourceOutpoint)
    )
    const formattedInputs = formatInputs(sortedInputs)
    formattedInputs.forEach(({ log: inputLog, logColor: inputLogColor }) => {
      log += `\n${inputLog}`
      logColor += `\n${inputLogColor}`
    })

    log += `\n${formatIndentedLine(1, `outputs: ${action?.outputs?.length ?? 0}`)}`
    logColor += `\n${formatIndentedLine(1, chalk.gray(`outputs: ${action?.outputs?.length ?? 0}`))}`

    const sortedOutputs = action?.outputs
      ?.slice()
      .sort((a, b) => a.satoshis - b.satoshis)
    const formattedOutputs = formatOutputs(sortedOutputs)
    formattedOutputs.forEach(({ log: outputLog, logColor: outputLogColor }) => {
      log += `\n${outputLog}`
      logColor += `\n${outputLogColor}`
    })

    return { log, logColor }
  } catch (error) {
    return {
      log: `Error parsing transaction: ${(error as Error).message}`,
      logColor: chalk.red(
        `Error parsing transaction: ${(error as Error).message}`
      )
    }
  }
}

/**
 * Checks if an object is empty (has no keys).
 * @param obj - The object to check.
 * @returns `true` if the object is empty, otherwise `false`.
 */
export const isEmptyObject = (obj: unknown): boolean => {
  return !!obj && typeof obj === 'object' && Object.keys(obj).length === 0
}

const formatIndentedLine = (indent: number, content: string) =>
  ' '.repeat(indent * 2) + content.trim() // Trim ensures no accidental double spacing

function log(s: string) {
  if (!noLog) console.log(s)
  //if (!noLog) process.stdout.write(s)
}

// 2025-02-03 15:40:53 [createAction nosend transactions 1_transaction_with_atomicBEEF_check]
// transactions:3\n  txid:2d0a7d1d197e3e4dd8b7d0fe9c79289e3497b86a300b8e0b175db4ff36cedfba version:1 lockTime:0 sats:-4 status:nosend outgoing:true desc:'Funding transaction' labels:['funding transaction for createaction','this is an extra long test label that should be truncated at 80 chars when it is...']\n  inputs: 1\n    0: sourceTXID:a3a8fe7f541c1383ff7b975af49b27284ae720af5f2705d8409baaf519190d26.2 sats:913 lock:(50)76a914f7238871139f4926cbd592a03a737981e558245d88ac unlock:(214)4830450221009f9af62b579b62152e70b63b61ee044d634028bad866d5ed74189d41d4695eef0220... seq:4294967295\n  outputs: 2\n    0: sats:3 lock:(48)76a914abcdef0123456789abcdef0123456789abcdef88ac index:1 spendable:true basket:'funding basket' desc:'Funding Output' tags:['funding transaction output','test tag']\n    1: sats:909 lock:(50)76a914e6488074d7b3f0b10476e6e2fba3f858b535d5a088ac index:0 spendable:true basket:'default'###LOGCOLOR### \n [90mtransactions:3[39m [90mkey:[39m ([34mtxid/outpoint[39m [36mscript[39m [32msats[39m)\n  [34m2d0a7d1d197e3e4dd8b7d0fe9c79289e3497b86a300b8e0b175db4ff36cedfba[39m [90mversion:[39m1 [90mlockTime:[39m0 [32m-4 sats[39m [90mstatus:[39m[37mnosend[39m [90moutgoing:[39m[37mtrue[39m [90mdesc:[39m[37mFunding transaction[39m [90mlabels:[39m[37m['funding transaction for createaction','this is an extra long test label that should be truncated at 80 chars when it is...'][39m\n  [90minputs: 1[39m\n    [90m0:[39m [34ma3a8fe7f541c1383ff7b975af49b27284ae720af5f2705d8409baaf519190d26.2[39m [32m913 sats[39m [90mlock:[39m(50)[36m76a914f7238871139f4926cbd592a03a737981e558245d88ac[39m [90munlock:[39m(214)[36m4830450221009f9af62b579b62152e70b63b61ee044d634028bad866d5ed74189d41d4695eef0220...[39m [90mseq:[39m4294967295\n  [90moutputs: 2[39m\n    [90m0:[39m [32m3 sats[39m [90mlock:[39m(48)[36m76a914abcdef0123456789abcdef0123456789abcdef88ac[39m [90mindex:[39m[37m1[39m [90mspendable:[39m[37mtrue[39m [90mbasket:[39m[37mfunding basket[39m [90mdesc:[39m[37mFunding Output[39m [90mtags:[39m[37m['funding transaction output','test tag'][39m\n    [90m1:[39m [32m909 sats[39m [90mlock:[39m(50)[36m76a914e6488074d7b3f0b10476e6e2fba3f858b535d5a088ac[39m [90mindex:[39m[37m0[39m [90mspendable:[39m[37mtrue[39m [90mbasket:[39m[37mdefault[39m

// 2025-02-03 15:41:20 [createAction nosend transactions 1_transaction_with_atomicBEEF_check]
// transactions:3\n  txid:ff2b7887099fb16244bd113c9ac5e04fde2d5c3d42ca01a8004b1672e2c82d0d version:1 lockTime:0 sats:-4 status:nosend outgoing:true desc:'Funding transaction' labels:['funding transaction for createaction','this is an extra long test label that should be truncated at 80 chars when it is...']\n  inputs: 1\n    0: sourceTXID:a3a8fe7f541c1383ff7b975af49b27284ae720af5f2705d8409baaf519190d26.2 sats:913 lock:(50)76a914f7238871139f4926cbd592a03a737981e558245d88ac unlock:(212)47304402202c65eb5199c44eb17f00955d5cd7f2743e42cdba9b8f80efacddfe2b5550020602204b... seq:4294967295\n  outputs: 2\n    0: sats:3 lock:(48)76a914abcdef0123456789abcdef0123456789abcdef88ac index:0 spendable:true basket:'funding basket' desc:'Funding Output' tags:['funding transaction output','test tag']\n    1: sats:909 lock:(50)76a914ef86329a99d9c249c123a8ab811d4b353c4bbca088ac index:1 spendable:true basket:'default'###LOGCOLOR### \n [90mtransactions:3[39m [90mkey:[39m ([34mtxid/outpoint[39m [36mscript[39m [32msats[39m)\n  [34mff2b7887099fb16244bd113c9ac5e04fde2d5c3d42ca01a8004b1672e2c82d0d[39m [90mversion:[39m1 [90mlockTime:[39m0 [32m-4 sats[39m [90mstatus:[39m[37mnosend[39m [90moutgoing:[39m[37mtrue[39m [90mdesc:[39m[37mFunding transaction[39m [90mlabels:[39m[37m['funding transaction for createaction','this is an extra long test label that should be truncated at 80 chars when it is...'][39m\n  [90minputs: 1[39m\n    [90m0:[39m [34ma3a8fe7f541c1383ff7b975af49b27284ae720af5f2705d8409baaf519190d26.2[39m [32m913 sats[39m [90mlock:[39m(50)[36m76a914f7238871139f4926cbd592a03a737981e558245d88ac[39m [90munlock:[39m(212)[36m47304402202c65eb5199c44eb17f00955d5cd7f2743e42cdba9b8f80efacddfe2b5550020602204b...[39m [90mseq:[39m4294967295\n  [90moutputs: 2[39m\n    [90m0:[39m [32m3 sats[39m [90mlock:[39m(48)[36m76a914abcdef0123456789abcdef0123456789abcdef88ac[39m [90mindex:[39m[37m0[39m [90mspendable:[39m[37mtrue[39m [90mbasket:[39m[37mfunding basket[39m [90mdesc:[39m[37mFunding Output[39m [90mtags:[39m[37m['funding transaction output','test tag'][39m\n    [90m1:[39m [32m909 sats[39m [90mlock:[39m(50)[36m76a914ef86329a99d9c249c123a8ab811d4b353c4bbca088ac[39m [90mindex:[39m[37m1[39m [90mspendable:[39m[37mtrue[39m [90mbasket:[39m[37mdefault[39m

// 2025-02-03 15:43:26 [createAction nosend transactions 1_transaction_with_atomicBEEF_check]
// transactions:3\n  txid:bfa323ce2547938dce5c38964394a39e8eab11a9179b3db73ee016e98880330b version:1 lockTime:0 sats:-4 status:nosend outgoing:true desc:'Funding transaction' labels:['funding transaction for createaction','this is an extra long test label that should be truncated at 80 chars when it is...']\n  inputs: 1\n    0: sourceTXID:a3a8fe7f541c1383ff7b975af49b27284ae720af5f2705d8409baaf519190d26.2 sats:913 lock:(50)76a914f7238871139f4926cbd592a03a737981e558245d88ac unlock:(212)47304402201fad0d77dcd53c976fbb3004c3b278b2e19078c8b6356e44d2a669d6240169b1022015... seq:4294967295\n  outputs: 2\n    0: sats:3 lock:(48)76a914abcdef0123456789abcdef0123456789abcdef88ac index:1 spendable:true basket:'funding basket' desc:'Funding Output' tags:['funding transaction output','test tag']\n    1: sats:909 lock:(50)76a914d26b17bc2ba06c1208ed971093987e1fb093a70b88ac index:0 spendable:true basket:'default'###LOGCOLOR### \n [90mtransactions:3[39m [90mkey:[39m ([34mtxid/outpoint[39m [36mscript[39m [32msats[39m)\n  [34mbfa323ce2547938dce5c38964394a39e8eab11a9179b3db73ee016e98880330b[39m [90mversion:[39m1 [90mlockTime:[39m0 [32m-4 sats[39m [90mstatus:[39m[37mnosend[39m [90moutgoing:[39m[37mtrue[39m [90mdesc:[39m[37mFunding transaction[39m [90mlabels:[39m[37m['funding transaction for createaction','this is an extra long test label that should be truncated at 80 chars when it is...'][39m\n  [90minputs: 1[39m\n    [90m0:[39m [34ma3a8fe7f541c1383ff7b975af49b27284ae720af5f2705d8409baaf519190d26.2[39m [32m913 sats[39m [90mlock:[39m(50)[36m76a914f7238871139f4926cbd592a03a737981e558245d88ac[39m [90munlock:[39m(212)[36m47304402201fad0d77dcd53c976fbb3004c3b278b2e19078c8b6356e44d2a669d6240169b1022015...[39m [90mseq:[39m4294967295\n  [90moutputs: 2[39m\n    [90m0:[39m [32m3 sats[39m [90mlock:[39m(48)[36m76a914abcdef0123456789abcdef0123456789abcdef88ac[39m [90mindex:[39m[37m1[39m [90mspendable:[39m[37mtrue[39m [90mbasket:[39m[37mfunding basket[39m [90mdesc:[39m[37mFunding Output[39m [90mtags:[39m[37m['funding transaction output','test tag'][39m\n    [90m1:[39m [32m909 sats[39m [90mlock:[39m(50)[36m76a914d26b17bc2ba06c1208ed971093987e1fb093a70b88ac[39m [90mindex:[39m[37m0[39m [90mspendable:[39m[37mtrue[39m [90mbasket:[39m[37mdefault[39m
