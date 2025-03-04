import { sdk } from '../../../src'
import { _tu, TestWalletNoSetup } from '../../utils/TestUtilsWalletStorage'

describe('specOps tests', () => {
  jest.setTimeout(99999999)

  test('00', () => {})
  if (_tu.noTestEnv('test')) return
  if (_tu.noTestEnv('main')) return

  test('0 wallet balance specOp', async () => {
    const setup = await createSetup('test')

    const r = await setup.wallet.listOutputs({
      basket: '893b7646de0e1c9f741bd6e9169b76a8847ae34adef7bef1e6a285371206d2e8'
    })

    expect(r.totalOutputs > 0).toBe(true)
    expect(r.outputs.length === 0).toBe(true)

    await setup.wallet.destroy()
  })

  test('1 wallet invalid change outputs', async () => {
    const setup = await createSetup('test')

    const r = await setup.wallet.listOutputs({
      basket: '5a76fd430a311f8bc0553859061710a4475c19fed46e2ff95969aa918e612e57'
      //tags: ['release', 'foobar']
    })

    expect(r.totalOutputs).toBe(0)
    expect(r.outputs.length).toBe(0)

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
    addLocalBackup: false,
    useMySQLConnectionForClient: false
  })

  console.log(`ACTIVE STORAGE: ${setup.storage.getActiveStoreName()}`)

  return setup
}
