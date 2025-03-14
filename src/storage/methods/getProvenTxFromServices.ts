import { EntityProvenTx, ProvenTxFromTxidResult, sdk, TableProvenTx } from "../../index.client"

/*
 * Given a txid and optionally its rawTx, create a new ProvenTx object.
 *
 * rawTx is fetched if not provided.
 *
 * Only succeeds (proven is not undefined) if a proof is confirmed for rawTx,
 * and hash of rawTx is confirmed to match txid
 *
 * The returned ProvenTx and ProvenTxReq objects have not been added to the storage database,
 * this is optional and can be done by the caller if appropriate.
 *
 * @param txid
 * @param services
 * @param rawTx
 * @returns
 */
export async function getProvenTxFromServices(
  txid: string,
  services: sdk.WalletServices,
  rawTx?: number[]
): Promise<ProvenTxFromTxidResult> {
  const r: ProvenTxFromTxidResult = { proven: undefined, rawTx }

  const chain = services.chain

  if (!r.rawTx) {
    const gr = await services.getRawTx(txid)
    if (!gr?.rawTx)
      // Failing to find anything...
      return r
    r.rawTx = gr.rawTx!
  }

  const gmpr = await services.getMerklePath(txid)

  if (gmpr.merklePath && gmpr.header) {
    const index = gmpr.merklePath.path[0].find(l => l.hash === txid)?.offset
    if (index !== undefined) {
      const api: TableProvenTx = {
        created_at: new Date(),
        updated_at: new Date(),
        provenTxId: 0,
        txid,
        height: gmpr.header.height,
        index,
        merklePath: gmpr.merklePath.toBinary(),
        rawTx: r.rawTx,
        blockHash: gmpr.header.hash,
        merkleRoot: gmpr.header.merkleRoot
      }
      r.proven = new EntityProvenTx(api)
    }
  }

  return r
}
