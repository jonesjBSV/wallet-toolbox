import { Services, StorageKnex } from "../../../src"
import { _tu } from "../../utils/TestUtilsWalletStorage"
import { confirmSpendableOutputs } from "../local/localWallet.man.test"

describe('janitor tests', () => {
    jest.setTimeout(99999999)

    test('0 review utxos by identity key', async () => {
        const env = _tu.getEnv('main')
        if (!env.cloudMySQLConnection) return

        const connection = JSON.parse(env.cloudMySQLConnection)
        const storage = new StorageKnex({
            ...StorageKnex.defaultOptions(),
            knex: _tu.createMySQLFromConnection(connection),
            chain: env.chain
        })
        await storage.makeAvailable()

        const services = new Services(env.chain)

        const identityKey = '03894bda9b11626c0280ec28f0d0193e9bd34446679ed1b32e5621e94e0e807073'
        const { invalidSpendableOutputs: notUtxos } =
            await confirmSpendableOutputs(storage, services, identityKey)
        const outputsToUpdate = notUtxos.map(o => ({
            id: o.outputId,
            satoshis: o.satoshis
        }))

        const total: number = outputsToUpdate.reduce((t, o) => t + o.satoshis, 0)

        debugger
        // *** About set spendable = false for outputs ***/
        for (const o of outputsToUpdate) {
            await storage.updateOutput(o.id, { spendable: false })
        }

        await storage.destroy()

    })
})