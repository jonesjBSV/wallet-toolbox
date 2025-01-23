import { _tu, expectToThrowWERR, TestWalletNoSetup } from '../../utils/TestUtilsStephen'
import { sdk } from '../../../src/index.client'
import * as bsv from '@bsv/sdk'

describe('getHeaderForHeight tests', () => {
  jest.setTimeout(99999999)

  const env = _tu.getEnv('test')
  const ctxs: TestWalletNoSetup[] = []

  beforeAll(async () => {
    if (!env.noMySQL) ctxs.push(await _tu.createLegacyWalletMySQLCopy('getHeaderForHeightTests'))
    ctxs.push(await _tu.createLegacyWalletSQLiteCopy('getHeaderForHeightTests'))
  })

  afterAll(async () => {
    for (const ctx of ctxs) {
      await ctx.storage.destroy()
    }
  })

  test('0 invalid params', async () => {
    for (const { wallet } of ctxs) {
      await expect(wallet.getHeaderForHeight({ height: -1 })).rejects.toThrow(Error)
    }
  })

  test('1 valid block height', async () => {
    for (const { wallet, services } of ctxs) {
      const mockSerializedHeader = Buffer.from('mock-header-data')
      services.getHeaderForHeight = jest.fn().mockResolvedValue(mockSerializedHeader)

      const height = 100
      const result = await wallet.getHeaderForHeight({ height })
      expect(result).toEqual({ header: mockSerializedHeader.toString('hex') })
      expect(services.getHeaderForHeight).toHaveBeenCalledWith(height)
    }
  })

  test('2 unexpected service errors', async () => {
    for (const { wallet, services } of ctxs) {
      services.getHeaderForHeight = jest.fn().mockRejectedValue(new Error('Service error'))

      await expect(wallet.getHeaderForHeight({ height: 100 })).rejects.toThrow(Error)
    }
  })

  test('3 valid block height, empty header', async () => {
    // Expected to handle empty headers gracefully rather than throwing an error
    for (const { wallet, services } of ctxs) {
      services.getHeaderForHeight = jest.fn().mockResolvedValue(Buffer.alloc(0)) // Empty header

      const result = await wallet.getHeaderForHeight({ height: 100 })
      expect(result.header).toBe('') // Empty header in hex format
    }
  })
})
