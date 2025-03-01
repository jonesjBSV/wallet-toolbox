import { sdk } from '../../../src'
import { _tu } from '../../utils/TestUtilsWalletStorage'

describe('localWallet tests', () => {
  jest.setTimeout(99999999)

  test('0', async () => {
    const chain: sdk.Chain = 'test'
    if (_tu.noTestEnv(chain)) return

    const setup = await _tu.createTestWallet(chain)
  })
})
