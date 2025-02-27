import { StorageKnex } from "../../../src"
import { _tu, TestWalletNoSetup } from "../../utils/TestUtilsWalletStorage"

describe('setActive tests', () => {
    jest.setTimeout(99999999)

    const env = _tu.getEnv('test')
    const chain = env.chain
    const rootKeyHex = env.devKeys[env.identityKey]
    let setup: {a: TestWalletNoSetup, b: TestWalletNoSetup, c: TestWalletNoSetup }
    let store: {a: StorageKnex, b: StorageKnex, c: StorageKnex }
    let storeKey: {a: string, b: string, c: string }
    const testName = () => expect.getState().currentTestName || 'test'
    
    beforeEach(async () => {
        const a = await _tu.createSQLiteTestWallet({ databaseName: `${testName()}_a`, chain, rootKeyHex, dropAll: true })
        const b = await _tu.createSQLiteTestWallet({ databaseName: `${testName()}_b`, chain, rootKeyHex, dropAll: true })
        const c = await _tu.createSQLiteTestWallet({ databaseName: `${testName()}_c`, chain, rootKeyHex, dropAll: true })
        setup = { a, b, c }
        store = { a: a.activeStorage, b: b.activeStorage, c: c.activeStorage }
        storeKey = { a: store.a._settings!.storageIdentityKey, b: store.b._settings!.storageIdentityKey, c: store.c._settings!.storageIdentityKey }
    })

    afterEach(async () => {
        await setup.a.wallet.destroy()
        await setup.b.wallet.destroy()
        await setup.c.wallet.destroy()
    })

    test('0', async () => {
        const s = await _tu.createWalletOnly({
            chain,
            rootKeyHex,
            active: store.a,
            backups: [store.b, store.c]
        })
        expect(s.storage.isAvailable() === true)
        expect(s.storage.isActiveEnabled === false)
        const log = await s.storage.setActive(storeKey.b)
        console.log(log)
        expect(s.storage.getActiveStore()).toBe(storeKey.b)
        expect(s.storage.isActiveEnabled === true)
    })
})