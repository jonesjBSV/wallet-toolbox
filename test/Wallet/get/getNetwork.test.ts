import { _tu, TestWalletNoSetup } from '../../utils/TestUtilsWalletStorage'

describe('Wallet getNetwork Tests', () => {
  jest.setTimeout(99999999)

  const env = _tu.getEnv('test')
  const ctxs: TestWalletNoSetup[] = []

  beforeAll(async () => {
    if (!env.noMySQL) ctxs.push(await _tu.createLegacyWalletMySQLCopy('getNetworkTests'))
    ctxs.push(await _tu.createLegacyWalletSQLiteCopy('getNetworkTests'))
  })

  afterAll(async () => {
    for (const ctx of ctxs) {
      await ctx.storage.destroy()
    }
  })

  test('should return the correct network', async () => {
    for (const { wallet } of ctxs) {
      const result = await wallet.getNetwork({})
      // Replace 'testnet' with the expected network for your test environment
      expect(result).toEqual({ network: 'testnet' })
    }
  })

  test('should throw if there is an unexpected error from the signer', async () => {
    for (const { wallet } of ctxs) {
      try {
        // Simulate signer throwing an error by overriding the getChain method
        wallet.signer.getChain = async () => {
          throw new Error('Unexpected error')
        }
        await wallet.getNetwork({})
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).toBe('Unexpected error')
        } else {
          throw new Error('Caught an unexpected non-Error type')
        }
      }
    }
  })
})
