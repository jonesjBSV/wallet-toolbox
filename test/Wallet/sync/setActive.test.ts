import knex from 'knex'
import { Setup, StorageKnex } from '../../../src'
import { _tu, TestWalletNoSetup } from '../../utils/TestUtilsWalletStorage'
import { Database } from 'sqlite3'

describe('setActive tests', () => {
  jest.setTimeout(99999999)

  const env = _tu.getEnv('test')
  const chain = env.chain
  const rootKeyHex = env.devKeys[env.identityKey]
  let setup: {
    a: TestWalletNoSetup
    b: TestWalletNoSetup
    c: TestWalletNoSetup
  }
  let store: { a: StorageKnex; b: StorageKnex; c: StorageKnex }
  let storeKey: { a: string; b: string; c: string }
  const testName = () => expect.getState().currentTestName || 'test'

  beforeEach(async () => {
    const a = await _tu.createSQLiteTestWallet({
      databaseName: `${testName()}_a`,
      chain,
      rootKeyHex,
      dropAll: true
    })
    const b = await _tu.createSQLiteTestWallet({
      databaseName: `${testName()}_b`,
      chain,
      rootKeyHex,
      dropAll: true
    })
    const c = await _tu.createSQLiteTestWallet({
      databaseName: `${testName()}_c`,
      chain,
      rootKeyHex,
      dropAll: true
    })
    setup = { a, b, c }
    store = { a: a.activeStorage, b: b.activeStorage, c: c.activeStorage }
    storeKey = {
      a: store.a._settings!.storageIdentityKey,
      b: store.b._settings!.storageIdentityKey,
      c: store.c._settings!.storageIdentityKey
    }
  })

  afterEach(async () => {
    await setup.a.wallet.destroy()
    await setup.b.wallet.destroy()
    await setup.c.wallet.destroy()
  })

  test('0 cycle active over three new sqlite wallets', async () => {
    const s = await _tu.createWalletOnly({
      chain,
      rootKeyHex,
      active: store.a,
      backups: [store.b, store.c]
    })
    let first: boolean = true
    for (const active of [storeKey.b, storeKey.c, storeKey.a]) {
      expect(s.storage.isAvailable() === true)
      expect(s.storage.isActiveEnabled === !first)
      const log = await s.storage.setActive(active)
      console.log(log)
      expect(s.storage.getActiveStore()).toBe(active)
      expect(s.storage.isActiveEnabled === true)
      first = false
    }
  })

  test('1 setActive on main storage wallet with local backup', async () => {
    if (Setup.noEnv('main')) return
    const env = _tu.getEnv('main')
    const s = await _tu.createTestWalletWithStorageClient({
      chain: env.chain,
      rootKeyHex: env.devKeys[env.identityKey]
    })
    const cloudStorageIdentityKey = s.storage.getActiveStore()
    //const filePath = '/Users/tone/Kz/tone42_backup.sqlite' // env.filePath
    const filePath = env.filePath
    if (filePath) {
      const localStore = (
        await _tu.createKnexTestWallet({
          knex: _tu.createLocalSQLite(filePath),
          databaseName: `sqlite for ${env.identityKey}`,
          chain: env.chain
        })
      ).activeStorage
      await s.storage.addWalletStorageProvider(localStore)
      {
        const log = await s.storage.setActive(cloudStorageIdentityKey)
        console.log(log)
      }
      {
        const log = await s.storage.setActive(
          localStore._settings!.storageIdentityKey
        )
        console.log(log)
      }
      {
        const log = await s.storage.setActive(cloudStorageIdentityKey)
        console.log(log)
      }
      expect(s.storage.isActiveEnabled)
    }
    await s.wallet.destroy()
  })

  test('2 setActive between two local backups', async () => {
    if (Setup.noEnv('main')) return
    const env = _tu.getEnv('main')
    const s = await _tu.createKnexTestWallet({
      knex: _tu.createLocalSQLite(env.filePath!),
      databaseName: `envFilePath for ${env.identityKey}`,
      chain: env.chain
    })
    const envStorageIdentityKey = s.storage.getActiveStore()
    const filePath = '/Users/tone/Kz/tone42_backup.sqlite'
    const localStore = (
      await _tu.createKnexTestWallet({
        knex: _tu.createLocalSQLite(filePath),
        databaseName: `sqlite for ${env.identityKey}`,
        chain: env.chain
      })
    ).activeStorage
    await s.storage.addWalletStorageProvider(localStore)
    {
      const log = await s.storage.setActive(envStorageIdentityKey)
      console.log(log)
    }
    {
      const log = await s.storage.setActive(
        localStore._settings!.storageIdentityKey
      )
      console.log(log)
    }
    {
      const log = await s.storage.setActive(envStorageIdentityKey)
      console.log(log)
    }
    expect(s.storage.isActiveEnabled)
    await s.wallet.destroy()
  })
})
