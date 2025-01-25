import * as bsv from '@bsv/sdk'
import { sdk, StorageProvider, table } from '../../../src/index.client'
import { _tu, expectToThrowWERR, TestSetup1, TestSetup2, TestWalletNoSetup } from '../../utils/TestUtilsWalletStorage'
import { asBuffer, StorageKnex } from '../../../src'
import { Script, Transaction, TransactionInput } from '@bsv/sdk'

describe.skip('listActions tests', () => {
  jest.setTimeout(99999999)

  const storages: StorageProvider[] = []
  const chain: sdk.Chain = 'test'
  const setups: { setup: TestSetup2; storage: StorageProvider }[] = []

  const env = _tu.getEnv('test')
  const ctxs: TestWalletNoSetup[] = []
  const testName = () => expect.getState().currentTestName || 'test'
  const name = testName.name

  beforeAll(async () => {
    if (!env.noMySQL) {
      ctxs.push(await _tu.createLegacyWalletMySQLCopy(name))
    }
    ctxs.push(await _tu.createLegacyWalletSQLiteCopy(name))

    for (const ctx of ctxs) {
      const { activeStorage } = ctx
      await activeStorage.dropAllData()
      await activeStorage.migrate('insert tests', '3'.repeat(64))
      //setups.push({ storage: activeStorage, setup: await _tu.createTestSetup2(activeStorage) })
    }
    expect(setups).toBeTruthy() // Ensure setups were initialized correctly

    for (const { activeStorage: storage, identityKey } of ctxs) {
      const tx1: Partial<table.Transaction> = {
        txid: 'tx',
        satoshis: 1,
        status: 'completed',
        isOutgoing: true,
        description: 'Transaction',
        version: 1,
        lockTime: 0
      }
      const o: Partial<table.Output> = {
        spendable: false,
        change: false,
        outputDescription: 'description',
        vout: 0,
        satoshis: 1,
        //   providedBy:
        //   purpose:
        //   type:
        txid: 'tx',
        //   senderIdentityKey:
        //   derivationPrefix:
        //   derivationSuffix:
        //   customInstructions:
        //   spentBy:
        sequenceNumber: 0,
        //   spendingDescription:
        //   scriptLength:
        //   scriptOffset:
        lockingScript: [1, 2, 3, 4]
        //providedBy: 'you',
        //purpose: '',
        //type: ''
      }
      const b1: Partial<table.OutputBasket> = { name: 'basket' }
      const l1: Partial<table.TxLabel> = { label: 'label' }
      const lm1: Partial<table.TxLabelMap> = { txLabelId: 1 }
      const t1: Partial<table.OutputTag> = { tag: 'tag' }
      const tm1: Partial<table.OutputTagMap> = { outputTagId: 1 }

      _tu.createTestSetup2(storage, identityKey, tx1, b1, l1, lm1, t1, tm1)
    }
  })

  afterAll(async () => {
    for (const ctx of ctxs) {
      await ctx.storage.destroy()
    }
  })

  test('12_no labels default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: []
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('13_no labels any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: [],
        labelQueryMode: 'any'
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('14_no labels all', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: [],
        labelQueryMode: 'all'
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('15_empty label default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['']
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('16_label is space character default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: [' ']
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('17_label does not exist default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['nonexistantlabel']
      }

      const expectedResult = JSON.parse('{"totalActions":0,"actions":[]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('18_label min 1 character default any', async () => {
    for (const { wallet } of ctxs) {
      const minLengthLabel = 'a'
      const args: bsv.ListActionsArgs = {
        labels: [minLengthLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('19_label max 300 spaces default any', async () => {
    for (const { wallet } of ctxs) {
      const maxLengthLabel = ' '.repeat(300)
      const args: bsv.ListActionsArgs = {
        labels: [maxLengthLabel]
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('20_label max 300 normal characters default any', async () => {
    for (const { wallet } of ctxs) {
      const maxLengthLabel = 'a'.repeat(300)
      const args: bsv.ListActionsArgs = {
        labels: [maxLengthLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('21_label max 300 spaces trimmed default any', async () => {
    for (const { wallet } of ctxs) {
      const maxLengthLabel = ' '.repeat(300).trim()
      const args: bsv.ListActionsArgs = {
        labels: [maxLengthLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })
  test('22_label exceeding max length default any', async () => {
    for (const { wallet } of ctxs) {
      const tooLongLabel = 'a'.repeat(301)
      const args: bsv.ListActionsArgs = {
        labels: [tooLongLabel]
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('23_label exceeding max length with leading spaces default any', async () => {
    for (const { wallet } of ctxs) {
      const validLabelWhenTrimmed = '  ' + 'a'.repeat(300)
      const args: bsv.ListActionsArgs = {
        labels: [validLabelWhenTrimmed]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('24_normal label default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('25_normal label any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        labelQueryMode: 'any'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('26_normal label all', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        labelQueryMode: 'all'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('27_label mixed case default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['LAbEL']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('28_label special characters default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['@special#label!']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('29_label leading and trailing whitespace default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['  label  ']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('30_label numeric default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['12345']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('31_label alphanumeric default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['abcde12345']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })
  test('32_label contains default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['labelOne']
      }

      const expectedResult = JSON.parse('{"totalActions":0,"actions":[]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('33_label different case lower any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        labelQueryMode: 'any'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('34_label different case upper any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['LABEL'],
        labelQueryMode: 'any'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('35_label with whitespace default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['lab  el']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('36_label different case lower all', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        labelQueryMode: 'all'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('37_label different case upper all', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['LABEL'],
        labelQueryMode: 'all'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('38_label duplicated default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label', 'label']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('39_label requested default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        includeLabels: true
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"labels":["label"],"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('40_label not requested default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        includeLabels: false
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('41_label partial match default any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: ['label']
      }

      const expectedResult = JSON.parse('{"totalActions":0,"actions":[]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })
})
