import {
  sdk,
  TableCertificate,
  TableCertificateField,
  TableCommission,
  TableOutput,
  TableOutputBasket,
  TableOutputTag,
  TableOutputTagMap,
  TableProvenTx,
  TableProvenTxReq,
  TableProvenTxReqDynamics,
  TableSyncState,
  TableTransaction,
  TableTxLabel,
  TableTxLabelMap,
  TableUser
} from '../index.client'

/**
 * This is the minimal interface required for a WalletStorageProvider to import and export data to another provider.
 */
export interface StorageSyncReaderWriter extends sdk.StorageSyncReader {
  getProvenOrRawTx(txid: string, trx?: sdk.TrxToken): Promise<sdk.ProvenOrRawTx>

  purgeData(
    params: sdk.PurgeParams,
    trx?: sdk.TrxToken
  ): Promise<sdk.PurgeResults>

  transaction<T>(
    scope: (trx: sdk.TrxToken) => Promise<T>,
    trx?: sdk.TrxToken
  ): Promise<T>

  findOutputTagMaps(
    args: sdk.FindOutputTagMapsArgs
  ): Promise<TableOutputTagMap[]>
  findProvenTxReqs(args: sdk.FindProvenTxReqsArgs): Promise<TableProvenTxReq[]>
  findProvenTxs(args: sdk.FindProvenTxsArgs): Promise<TableProvenTx[]>
  findTxLabelMaps(args: sdk.FindTxLabelMapsArgs): Promise<TableTxLabelMap[]>

  countOutputTagMaps(args: sdk.FindOutputTagMapsArgs): Promise<number>
  countProvenTxReqs(args: sdk.FindProvenTxReqsArgs): Promise<number>
  countProvenTxs(args: sdk.FindProvenTxsArgs): Promise<number>
  countTxLabelMaps(args: sdk.FindTxLabelMapsArgs): Promise<number>

  insertProvenTx(tx: TableProvenTx, trx?: sdk.TrxToken): Promise<number>
  insertProvenTxReq(tx: TableProvenTxReq, trx?: sdk.TrxToken): Promise<number>
  insertUser(user: TableUser, trx?: sdk.TrxToken): Promise<number>
  insertCertificate(
    certificate: TableCertificate,
    trx?: sdk.TrxToken
  ): Promise<number>
  insertCertificateField(
    certificateField: TableCertificateField,
    trx?: sdk.TrxToken
  ): Promise<void>
  insertOutputBasket(
    basket: TableOutputBasket,
    trx?: sdk.TrxToken
  ): Promise<number>
  insertTransaction(tx: TableTransaction, trx?: sdk.TrxToken): Promise<number>
  insertCommission(
    commission: TableCommission,
    trx?: sdk.TrxToken
  ): Promise<number>
  insertOutput(output: TableOutput, trx?: sdk.TrxToken): Promise<number>
  insertOutputTag(tag: TableOutputTag, trx?: sdk.TrxToken): Promise<number>
  insertOutputTagMap(
    tagMap: TableOutputTagMap,
    trx?: sdk.TrxToken
  ): Promise<void>
  insertTxLabel(label: TableTxLabel, trx?: sdk.TrxToken): Promise<number>
  insertTxLabelMap(labelMap: TableTxLabelMap, trx?: sdk.TrxToken): Promise<void>
  insertSyncState(
    syncState: TableSyncState,
    trx?: sdk.TrxToken
  ): Promise<number>

  updateCertificateField(
    certificateId: number,
    fieldName: string,
    update: Partial<TableCertificateField>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateCertificate(
    id: number,
    update: Partial<TableCertificate>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateCommission(
    id: number,
    update: Partial<TableCommission>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutputBasket(
    id: number,
    update: Partial<TableOutputBasket>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutput(
    id: number,
    update: Partial<TableOutput>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutputTagMap(
    outputId: number,
    tagId: number,
    update: Partial<TableOutputTagMap>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutputTag(
    id: number,
    update: Partial<TableOutputTag>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateProvenTxReq(
    id: number | number[],
    update: Partial<TableProvenTxReq>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateProvenTxReqDynamics(
    id: number,
    update: Partial<TableProvenTxReqDynamics>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateProvenTxReqWithNewProvenTx(
    args: sdk.UpdateProvenTxReqWithNewProvenTxArgs
  ): Promise<sdk.UpdateProvenTxReqWithNewProvenTxResult>
  updateProvenTx(
    id: number,
    update: Partial<TableProvenTx>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateSyncState(
    id: number,
    update: Partial<TableSyncState>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateTransaction(
    id: number | number[],
    update: Partial<TableTransaction>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateTransactionStatus(
    status: sdk.TransactionStatus,
    transactionId?: number,
    userId?: number,
    reference?: string,
    trx?: sdk.TrxToken
  ): Promise<void>
  updateTransactionsStatus(
    transactionIds: number[],
    status: sdk.TransactionStatus
  ): Promise<void>
  updateTxLabelMap(
    transactionId: number,
    txLabelId: number,
    update: Partial<TableTxLabelMap>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateTxLabel(
    id: number,
    update: Partial<TableTxLabel>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateUser(
    id: number,
    update: Partial<TableUser>,
    trx?: sdk.TrxToken
  ): Promise<number>

  findCertificateById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<TableCertificate | undefined>
  findCommissionById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<TableCommission | undefined>
  findOutputById(
    id: number,
    trx?: sdk.TrxToken,
    noScript?: boolean
  ): Promise<TableOutput | undefined>
  findOutputBasketById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<TableOutputBasket | undefined>
  findProvenTxById(
    id: number,
    trx?: sdk.TrxToken | undefined
  ): Promise<TableProvenTx | undefined>
  findProvenTxReqById(
    id: number,
    trx?: sdk.TrxToken | undefined
  ): Promise<TableProvenTxReq | undefined>
  findSyncStateById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<TableSyncState | undefined>
  findTransactionById(
    id: number,
    trx?: sdk.TrxToken,
    noRawTx?: boolean
  ): Promise<TableTransaction | undefined>
  findTxLabelById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<TableTxLabel | undefined>
  findOutputTagById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<TableOutputTag | undefined>
  findUserById(id: number, trx?: sdk.TrxToken): Promise<TableUser | undefined>

  findOrInsertUser(
    identityKey: string,
    trx?: sdk.TrxToken
  ): Promise<{ user: TableUser; isNew: boolean }>

  findOrInsertTransaction(
    newTx: TableTransaction,
    trx?: sdk.TrxToken
  ): Promise<{ tx: TableTransaction; isNew: boolean }>
  findOrInsertOutputBasket(
    userId: number,
    name: string,
    trx?: sdk.TrxToken
  ): Promise<TableOutputBasket>
  findOrInsertTxLabel(
    userId: number,
    label: string,
    trx?: sdk.TrxToken
  ): Promise<TableTxLabel>
  findOrInsertTxLabelMap(
    transactionId: number,
    txLabelId: number,
    trx?: sdk.TrxToken
  ): Promise<TableTxLabelMap>
  findOrInsertOutputTag(
    userId: number,
    tag: string,
    trx?: sdk.TrxToken
  ): Promise<TableOutputTag>
  findOrInsertOutputTagMap(
    outputId: number,
    outputTagId: number,
    trx?: sdk.TrxToken
  ): Promise<TableOutputTagMap>
  findOrInsertSyncStateAuth(
    auth: sdk.AuthId,
    storageIdentityKey: string,
    storageName: string
  ): Promise<{ syncState: TableSyncState; isNew: boolean }>
  findOrInsertProvenTxReq(
    newReq: TableProvenTxReq,
    trx?: sdk.TrxToken
  ): Promise<{ req: TableProvenTxReq; isNew: boolean }>
  findOrInsertProvenTx(
    newProven: TableProvenTx,
    trx?: sdk.TrxToken
  ): Promise<{ proven: TableProvenTx; isNew: boolean }>
  findUsers(args: sdk.FindUsersArgs): Promise<TableUser[]>

  tagOutput(
    partial: Partial<TableOutput>,
    tag: string,
    trx?: sdk.TrxToken
  ): Promise<void>

  processSyncChunk(
    args: sdk.RequestSyncChunkArgs,
    chunk: sdk.SyncChunk
  ): Promise<sdk.ProcessSyncChunkResult>
}
