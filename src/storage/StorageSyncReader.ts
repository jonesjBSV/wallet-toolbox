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
  TableSettings,
  TableSyncState,
  TableTransaction,
  TableTxLabel,
  TableTxLabelMap,
  TableUser
} from '../index.client'
import { StorageReader } from './StorageReader'

/**
 * The `StorageSyncReader` non-abstract class must be used when authentication checking access to the methods of a `StorageBaseReader` is required.
 *
 * Constructed from an `auth` object that must minimally include the authenticated user's identityKey,
 * and the `StorageBaseReader` to be protected.
 */
export class StorageSyncReader implements sdk.StorageSyncReader {
  constructor(
    public auth: sdk.AuthId,
    public storage: StorageReader
  ) {}

  isAvailable(): boolean {
    return this.storage.isAvailable()
  }
  async makeAvailable(): Promise<TableSettings> {
    await this.storage.makeAvailable()
    if (this.auth.userId === undefined) {
      const user = await this.storage.findUserByIdentityKey(
        this.auth.identityKey
      )
      if (!user) throw new sdk.WERR_UNAUTHORIZED()
      this.auth.userId = user.userId
    }
    return this.getSettings()
  }
  destroy(): Promise<void> {
    return this.storage.destroy()
  }
  getSettings(): TableSettings {
    return this.storage.getSettings()
  }
  async getSyncChunk(args: sdk.RequestSyncChunkArgs): Promise<sdk.SyncChunk> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.identityKey !== this.auth.identityKey)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.getSyncChunk(args)
  }
  async findUserByIdentityKey(key: string): Promise<TableUser | undefined> {
    if (!this.auth.userId) await this.makeAvailable()
    if (key !== this.auth.identityKey) throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findUserByIdentityKey(key)
  }
  async findSyncStates(
    args: sdk.FindSyncStatesArgs
  ): Promise<TableSyncState[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findSyncStates(args)
  }
  async findCertificateFields(
    args: sdk.FindCertificateFieldsArgs
  ): Promise<TableCertificateField[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findCertificateFields(args)
  }
  async findCertificates(
    args: sdk.FindCertificatesArgs
  ): Promise<TableCertificate[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findCertificates(args)
  }
  async findCommissions(
    args: sdk.FindCommissionsArgs
  ): Promise<TableCommission[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findCommissions(args)
  }
  async findOutputBaskets(
    args: sdk.FindOutputBasketsArgs
  ): Promise<TableOutputBasket[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findOutputBaskets(args)
  }
  async findOutputs(args: sdk.FindOutputsArgs): Promise<TableOutput[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findOutputs(args)
  }
  async findOutputTags(
    args: sdk.FindOutputTagsArgs
  ): Promise<TableOutputTag[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findOutputTags(args)
  }
  async findTransactions(
    args: sdk.FindTransactionsArgs
  ): Promise<TableTransaction[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findTransactions(args)
  }
  async findTxLabels(args: sdk.FindTxLabelsArgs): Promise<TableTxLabel[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.partial.userId !== this.auth.userId)
      throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.findTxLabels(args)
  }
  async getProvenTxsForUser(
    args: sdk.FindForUserSincePagedArgs
  ): Promise<TableProvenTx[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.userId !== this.auth.userId) throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.getProvenTxsForUser(args)
  }
  async getProvenTxReqsForUser(
    args: sdk.FindForUserSincePagedArgs
  ): Promise<TableProvenTxReq[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.userId !== this.auth.userId) throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.getProvenTxReqsForUser(args)
  }
  async getTxLabelMapsForUser(
    args: sdk.FindForUserSincePagedArgs
  ): Promise<TableTxLabelMap[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.userId !== this.auth.userId) throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.getTxLabelMapsForUser(args)
  }
  async getOutputTagMapsForUser(
    args: sdk.FindForUserSincePagedArgs
  ): Promise<TableOutputTagMap[]> {
    if (!this.auth.userId) await this.makeAvailable()
    if (args.userId !== this.auth.userId) throw new sdk.WERR_UNAUTHORIZED()
    return await this.storage.getOutputTagMapsForUser(args)
  }
}
