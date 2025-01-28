import * as bsv from '@bsv/sdk'
import { sdk, StorageProvider, table } from '../../../src/index.client'
import { _tu, expectToThrowWERR, MockData, TestSetup1, TestSetup2, TestWalletNoSetup, updateTable } from '../../utils/TestUtilsWalletStorage'
import { asBuffer, StorageKnex } from '../../../src'
import { Script, Transaction, TransactionInput } from '@bsv/sdk'

describe('listActions tests', () => {
  jest.setTimeout(99999999)

  const storages: StorageProvider[] = []
  const chain: sdk.Chain = 'test'
  const setups: { setup: TestSetup2; storage: StorageProvider }[] = []

  const env = _tu.getEnv('test')
  const ctxs: TestWalletNoSetup[] = []
  const testName = () => expect.getState().currentTestName || 'test'

  beforeAll(async () => {
    if (!env.noMySQL) {
      ctxs.push(await _tu.createLegacyWalletMySQLCopy(testName()))
    }
    ctxs.push(await _tu.createLegacyWalletSQLiteCopy(testName()))
    const mockData: MockData = {
      actions: [
        {
          txid: 'tx',
          satoshis: 1,
          status: 'completed',
          isOutgoing: true,
          description: 'Transaction',
          version: 1,
          lockTime: 0,
          inputs: [
            {
              sourceOutpoint: '0',
              sourceSatoshis: 1,
              sourceLockingScript: '0123456789abcdef',
              unlockingScript: '0123456789abcdef',
              inputDescription: 'description',
              sequenceNumber: 0
            }
          ],
          labels: ['label', 'label2'],
          outputs: [
            {
              satoshis: 1,
              spendable: false,
              tags: ['tag'],
              outputIndex: 0,
              outputDescription: 'description',
              basket: 'basket',
              lockingScript: '0123456789abcdef'
            }
          ]
        }
      ]
    }
    for (const ctx of ctxs) {
      const { activeStorage } = ctx
      await activeStorage.dropAllData()
      await activeStorage.migrate('insert tests', '3'.repeat(64))
    }
    expect(setups).toBeTruthy() // Ensure setups were initialized correctly

    for (const { activeStorage: storage, identityKey } of ctxs) {
      // Setup test environment with mock data
      await _tu.createTestSetup2(storage, identityKey, mockData)
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

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('13_no labels any', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: [],
        labelQueryMode: 'any'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('14_no labels all', async () => {
    for (const { wallet } of ctxs) {
      const args: bsv.ListActionsArgs = {
        labels: [],
        labelQueryMode: 'all'
      }
      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
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
        labels: ['nonexistantlabel'] // Testing with a non-existent label
      }

      const expectedResult = JSON.parse('{"totalActions":0,"actions":[]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('18_label min 1 character default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const minLengthLabel = 'a'
      await storage.updateTxLabel(1, { label: minLengthLabel })
      const args: bsv.ListActionsArgs = {
        labels: [minLengthLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('19_label max 300 spaces default any', async () => {
    for (const { wallet } of ctxs) {
      const maxLengthSpacesLabel = ' '.repeat(300)
      const args: bsv.ListActionsArgs = {
        labels: [maxLengthSpacesLabel]
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('20_label max 300 normal characters default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const maxLengthNormalLabel = 'a'.repeat(300)
      await storage.updateTxLabel(1, { label: maxLengthNormalLabel })
      const args: bsv.ListActionsArgs = {
        labels: [maxLengthNormalLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('21_label min 1 emoji default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const minimumEmojiLabel = generateRandomEmojiString(4)
      await storage.updateTxLabel(1, { label: minimumEmojiLabel })
      const args: bsv.ListActionsArgs = {
        labels: [minimumEmojiLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('22_label max length 75 emojis default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const maximumEmojisLabel = generateRandomEmojiString(300)
      await storage.updateTxLabel(1, { label: maximumEmojisLabel })
      const args: bsv.ListActionsArgs = {
        labels: [maximumEmojisLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('23_label exceeding max length 76 emojis default any', async () => {
    for (const { wallet } of ctxs) {
      const exceedingMaximumEmojisLabel = generateRandomEmojiString(304)
      const args: bsv.ListActionsArgs = {
        labels: [exceedingMaximumEmojisLabel]
      }

      await expectToThrowWERR(sdk.WERR_INVALID_PARAMETER, async () => await wallet.listActions(args))
    }
  })

  test('24_normal label default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const label = 'label'
      await storage.updateTxLabel(1, { label })
      const args: bsv.ListActionsArgs = {
        labels: [label]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('25_normal label any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const label = 'label'
      await storage.updateTxLabel(1, { label })
      const args: bsv.ListActionsArgs = {
        labels: [label],
        labelQueryMode: 'any'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('26_normal label all', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const label = 'label'
      await storage.updateTxLabel(1, { label })
      const args: bsv.ListActionsArgs = {
        labels: [label],
        labelQueryMode: 'all'
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  // Can't test mixed case at storage level
  // test('27_label mixed case default any', async () => {
  //   for (const { activeStorage: storage, wallet } of ctxs) {
  //     const mixedCaseLabel = 'LAbEL'
  //     await storage.updateTxLabel(1, { label: mixedCaseLabel })
  //     const args: bsv.ListActionsArgs = {
  //       labels: [mixedCaseLabel]
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  test('28_label special characters default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const specialCharsLabel = '@special#label!'
      await storage.updateTxLabel(1, { label: specialCharsLabel })
      const args: bsv.ListActionsArgs = {
        labels: [specialCharsLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  // Can't test external whitespace at storage level
  // test('29_label leading and trailing whitespace default any', async () => {
  //   for (const { activeStorage: storage, wallet } of ctxs) {
  //     const leadTrailSpacesLabel = '  label  '
  //     await storage.updateTxLabel(1, { label: leadTrailSpacesLabel })
  //     const args: bsv.ListActionsArgs = {
  //       labels: [leadTrailSpacesLabel]
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  test('30_label numeric default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const numericLabel = '12345'
      await storage.updateTxLabel(1, { label: numericLabel })
      const args: bsv.ListActionsArgs = {
        labels: [numericLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('31_label alphanumeric default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const alphaumericLabel = 'abcde12345'
      await storage.updateTxLabel(1, { label: alphaumericLabel })
      const args: bsv.ListActionsArgs = {
        labels: [alphaumericLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('32_label contains default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const containsLabel = 'label'
      await storage.updateTxLabel(1, { label: containsLabel })
      const args: bsv.ListActionsArgs = {
        labels: ['labelone']
      }

      const expectedResult = JSON.parse('{"totalActions":0,"actions":[]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  // Can't test mixed case at storage level
  // test('33_label different case lower any', async () => {
  //   for (const { wallet } of ctxs) {
  //     const args: bsv.ListActionsArgs = {
  //       labels: ['label'],
  //       labelQueryMode: 'any'
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  // test('34_label different case upper any', async () => {
  //   for (const { wallet } of ctxs) {
  //     const args: bsv.ListActionsArgs = {
  //       labels: ['LABEL'],
  //       labelQueryMode: 'any'
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  test('35_label with whitespace default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const spacedLabel = 'lab  el'
      await storage.updateTxLabel(1, { label: spacedLabel })
      const args: bsv.ListActionsArgs = {
        labels: [spacedLabel]
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  // Can't test mixed case at storage level
  // test('36_label different case lower all', async () => {
  //   for (const { wallet } of ctxs) {
  //     const args: bsv.ListActionsArgs = {
  //       labels: ['label'],
  //       labelQueryMode: 'all'
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  // test('37_label different case upper all', async () => {
  //   for (const { wallet } of ctxs) {
  //     const args: bsv.ListActionsArgs = {
  //       labels: ['LABEL'],
  //       labelQueryMode: 'all'
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  // test('38_label duplicated default any', async () => {
  //   for (const { activeStorage: storage, wallet } of ctxs) {
  //     const pairSameLabels = ['label', 'label']
  //     await storage.updateTxLabel(1, { label: pairSameLabels[0] })
  //     await storage.updateTxLabel(2, { label: pairSameLabels[1] })
  //     const args: bsv.ListActionsArgs = {
  //       labels: pairSameLabels
  //     }

  //     const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

  //     expect(await wallet.listActions(args)).toEqual(expectedResult)
  //   }
  // })

  test('39_label requested default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const label = 'label'
      await storage.updateTxLabel(1, { label })
      await storage.updateTxLabel(2, { label: 'label2' })
      const args: bsv.ListActionsArgs = {
        labels: [label],
        includeLabels: true
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"labels":["label","label2"],"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('40_label not requested default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      const label = 'label'
      await storage.updateTxLabel(1, { label })
      const args: bsv.ListActionsArgs = {
        labels: [label],
        includeLabels: false
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('41_label partial match default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      await storage.updateTxLabel(1, { label: 'labels' })
      await storage.updateTxLabel(2, { label: 'label2' })
      const args: bsv.ListActionsArgs = {
        labels: ['label'],
        includeLabels: true
      }

      const expectedResult = JSON.parse('{"totalActions":0,"actions":[]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })

  test('42_label only one match default any', async () => {
    for (const { activeStorage: storage, wallet } of ctxs) {
      await storage.updateTxLabel(1, { label: 'labels' })
      await storage.updateTxLabel(2, { label: 'label' })
      const args: bsv.ListActionsArgs = {
        labels: ['label']
      }

      const expectedResult = JSON.parse('{"totalActions":1,"actions":[{"txid":"tx","satoshis":1,"status":"completed","isOutgoing":true,"description":"Transaction","version":1,"lockTime":0}]}')

      expect(await wallet.listActions(args)).toEqual(expectedResult)
    }
  })
})
const generateRandomEmojiString = (bytes: number): string => {
  const emojiRange = [
    '\u{1F600}', // Grinning face
    '\u{1F603}', // Smiling face
    '\u{1F604}', // Laughing face
    '\u{1F609}', // Winking face
    '\u{1F60A}', // Blushing face
    '\u{1F60D}', // Heart eyes
    '\u{1F618}', // Kissing face
    '\u{1F61C}', // Tongue out
    '\u{1F923}', // Rolling on the floor laughing
    '\u{1F44D}' // Thumbs up
  ]

  const bytesPerEmoji = 4 // Each emoji is 4 bytes in UTF-8
  const numEmojis = Math.floor(bytes / bytesPerEmoji)

  let result = ''
  for (let i = 0; i < numEmojis; i++) {
    result += emojiRange[Math.floor(Math.random() * emojiRange.length)]
  }

  return result
}
