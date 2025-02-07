import { sdk, table } from '../index.client'

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
  ): Promise<table.TableOutputTagMap[]>
  findProvenTxReqs(args: sdk.FindProvenTxReqsArgs): Promise<table.TableProvenTxReq[]>
  findProvenTxs(args: sdk.FindProvenTxsArgs): Promise<table.TableProvenTx[]>
  findTxLabelMaps(args: sdk.FindTxLabelMapsArgs): Promise<table.TableTxLabelMap[]>

  countOutputTagMaps(args: sdk.FindOutputTagMapsArgs): Promise<number>
  countProvenTxReqs(args: sdk.FindProvenTxReqsArgs): Promise<number>
  countProvenTxs(args: sdk.FindProvenTxsArgs): Promise<number>
  countTxLabelMaps(args: sdk.FindTxLabelMapsArgs): Promise<number>

  insertProvenTx(tx: table.TableProvenTx, trx?: sdk.TrxToken): Promise<number>
  insertProvenTxReq(tx: table.TableProvenTxReq, trx?: sdk.TrxToken): Promise<number>
  insertUser(user: table.TableUser, trx?: sdk.TrxToken): Promise<number>
  insertCertificate(
    certificate: table.TableCertificate,
    trx?: sdk.TrxToken
  ): Promise<number>
  insertCertificateField(
    certificateField: table.TableCertificateField,
    trx?: sdk.TrxToken
  ): Promise<void>
  insertOutputBasket(
    basket: table.TableOutputBasket,
    trx?: sdk.TrxToken
  ): Promise<number>
  insertTransaction(tx: table.TableTransaction, trx?: sdk.TrxToken): Promise<number>
  insertCommission(
    commission: table.TableCommission,
    trx?: sdk.TrxToken
  ): Promise<number>
  insertOutput(output: table.TableOutput, trx?: sdk.TrxToken): Promise<number>
  insertOutputTag(tag: table.TableOutputTag, trx?: sdk.TrxToken): Promise<number>
  insertOutputTagMap(
    tagMap: table.TableOutputTagMap,
    trx?: sdk.TrxToken
  ): Promise<void>
  insertTxLabel(label: table.TableTxLabel, trx?: sdk.TrxToken): Promise<number>
  insertTxLabelMap(
    labelMap: table.TableTxLabelMap,
    trx?: sdk.TrxToken
  ): Promise<void>
  insertSyncState(
    syncState: table.TableSyncState,
    trx?: sdk.TrxToken
  ): Promise<number>

  updateCertificateField(
    certificateId: number,
    fieldName: string,
    update: Partial<table.TableCertificateField>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateCertificate(
    id: number,
    update: Partial<table.TableCertificate>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateCommission(
    id: number,
    update: Partial<table.TableCommission>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutputBasket(
    id: number,
    update: Partial<table.TableOutputBasket>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutput(
    id: number,
    update: Partial<table.TableOutput>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutputTagMap(
    outputId: number,
    tagId: number,
    update: Partial<table.TableOutputTagMap>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateOutputTag(
    id: number,
    update: Partial<table.TableOutputTag>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateProvenTxReq(
    id: number | number[],
    update: Partial<table.TableProvenTxReq>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateProvenTxReqDynamics(
    id: number,
    update: Partial<table.ProvenTxReqDynamics>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateProvenTxReqWithNewProvenTx(
    args: sdk.UpdateProvenTxReqWithNewProvenTxArgs
  ): Promise<sdk.UpdateProvenTxReqWithNewProvenTxResult>
  updateProvenTx(
    id: number,
    update: Partial<table.TableProvenTx>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateSyncState(
    id: number,
    update: Partial<table.TableSyncState>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateTransaction(
    id: number | number[],
    update: Partial<table.TableTransaction>,
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
    update: Partial<table.TableTxLabelMap>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateTxLabel(
    id: number,
    update: Partial<table.TableTxLabel>,
    trx?: sdk.TrxToken
  ): Promise<number>
  updateUser(
    id: number,
    update: Partial<table.TableUser>,
    trx?: sdk.TrxToken
  ): Promise<number>

  findCertificateById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableCertificate | undefined>
  findCommissionById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableCommission | undefined>
  findOutputById(
    id: number,
    trx?: sdk.TrxToken,
    noScript?: boolean
  ): Promise<table.TableOutput | undefined>
  findOutputBasketById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableOutputBasket | undefined>
  findProvenTxById(
    id: number,
    trx?: sdk.TrxToken | undefined
  ): Promise<table.TableProvenTx | undefined>
  findProvenTxReqById(
    id: number,
    trx?: sdk.TrxToken | undefined
  ): Promise<table.TableProvenTxReq | undefined>
  findSyncStateById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableSyncState | undefined>
  findTransactionById(
    id: number,
    trx?: sdk.TrxToken,
    noRawTx?: boolean
  ): Promise<table.TableTransaction | undefined>
  findTxLabelById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableTxLabel | undefined>
  findOutputTagById(
    id: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableOutputTag | undefined>
  findUserById(id: number, trx?: sdk.TrxToken): Promise<table.TableUser | undefined>

  findOrInsertUser(
    identityKey: string,
    trx?: sdk.TrxToken
  ): Promise<{ user: table.TableUser; isNew: boolean }>

  findOrInsertTransaction(
    newTx: table.TableTransaction,
    trx?: sdk.TrxToken
  ): Promise<{ tx: table.TableTransaction; isNew: boolean }>
  findOrInsertOutputBasket(
    userId: number,
    name: string,
    trx?: sdk.TrxToken
  ): Promise<table.TableOutputBasket>
  findOrInsertTxLabel(
    userId: number,
    label: string,
    trx?: sdk.TrxToken
  ): Promise<table.TableTxLabel>
  findOrInsertTxLabelMap(
    transactionId: number,
    txLabelId: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableTxLabelMap>
  findOrInsertOutputTag(
    userId: number,
    tag: string,
    trx?: sdk.TrxToken
  ): Promise<table.TableOutputTag>
  findOrInsertOutputTagMap(
    outputId: number,
    outputTagId: number,
    trx?: sdk.TrxToken
  ): Promise<table.TableOutputTagMap>
  findOrInsertSyncStateAuth(
    auth: sdk.AuthId,
    storageIdentityKey: string,
    storageName: string
  ): Promise<{ syncState: table.TableSyncState; isNew: boolean }>
  findOrInsertProvenTxReq(
    newReq: table.TableProvenTxReq,
    trx?: sdk.TrxToken
  ): Promise<{ req: table.TableProvenTxReq; isNew: boolean }>
  findOrInsertProvenTx(
    newProven: table.TableProvenTx,
    trx?: sdk.TrxToken
  ): Promise<{ proven: table.TableProvenTx; isNew: boolean }>
  findUsers(args: sdk.FindUsersArgs): Promise<table.TableUser[]>

  tagOutput(
    partial: Partial<table.TableOutput>,
    tag: string,
    trx?: sdk.TrxToken
  ): Promise<void>

  processSyncChunk(
    args: sdk.RequestSyncChunkArgs,
    chunk: sdk.SyncChunk
  ): Promise<sdk.ProcessSyncChunkResult>
}
