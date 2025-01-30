import { Beef, Utils } from '@bsv/sdk'
import { Services } from '../../index.client'

describe('postTxs service tests', () => {
  jest.setTimeout(99999999)

  test('0', async () => {
    const options = Services.createDefaultOptions('main')
    const services = new Services(options)

    const txid =
      'b56ccf7dd0eb6bb0341cb92a2045d902106e4c2add0a4af057c85e9dfaaebddf'
    const rawTx = await services.getRawTx(txid)
    const rawTxHex = Utils.toHex(rawTx.rawTx!)
    const beef = new Beef()
    beef.mergeRawTx(rawTx.rawTx!)
    const r = await services.postTxs(beef, [txid])
    if (r[0].status === 'error') {
      console.log(`
${r[0].error?.message}
${beef.toLogString()}
${beef.toHex()}
              `)
    }
    if (r[0].error?.message != 'broadcastMany error: error code: 502')
      expect(r[0].status).toBe('success')
  })
})
