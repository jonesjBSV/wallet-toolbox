import {
  AbortActionArgs,
  AbortActionResult,
  InternalizeActionArgs,
  InternalizeActionResult,
  ListActionsResult,
  ListCertificatesResult,
  ListOutputsResult,
  RelinquishCertificateArgs,
  RelinquishOutputArgs,
  WalletInterface
} from '@bsv/sdk'
import {
  sdk,
  TableCertificate,
  TableCertificateX,
  TableOutput,
  TableOutputBasket,
  TableProvenTxReq,
  TableSettings,
  TableSyncState,
  TableUser
} from '../../index.client'
import { AuthFetch } from '@bsv/sdk'

/**
 * `StorageClient` implements the `WalletStorageProvider` interface which allows it to
 * serve as a BRC-100 wallet's active storage.
 *
 * Internally, it uses JSON-RPC over HTTPS to make requests of a remote server.
 * Typically this server uses the `StorageServer` class to implement the service.
 *
 * The `AuthFetch` component is used to secure and authenticate the requests to the remote server.
 *
 * `AuthFetch` is initialized with a BRC-100 wallet which establishes the identity of
 * the party making requests of the remote service.
 *
 * For details of the API implemented, follow the "See also" link for the `WalletStorageProvider` interface.
 */
export class StorageClient implements sdk.WalletStorageProvider {
  private endpointUrl: string
  private nextId = 1
  private authClient: AuthFetch

  // Track ephemeral (in-memory) "settings" if you wish to align with isAvailable() checks
  public settings?: TableSettings

  constructor(wallet: WalletInterface, endpointUrl: string) {
    this.authClient = new AuthFetch(wallet)
    this.endpointUrl = endpointUrl
  }

  /**
   * The `StorageClient` implements the `WalletStorageProvider` interface.
   * It does not implement the lower level `StorageProvider` interface.
   *
   * @returns false
   */
  isStorageProvider(): boolean {
    return false
  }

  //////////////////////////////////////////////////////////////////////////////
  // JSON-RPC helper
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Make a JSON-RPC call to the remote server.
   * @param method The WalletStorage method name to call.
   * @param params The array of parameters to pass to the method in order.
   */
  private async rpcCall<T>(method: string, params: unknown[]): Promise<T> {
    try {
      const id = this.nextId++
      const body = {
        jsonrpc: '2.0',
        method,
        params,
        id
      }

      let response: Response
      try {
        response = await this.authClient.fetch(this.endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      } catch (eu: unknown) {
        throw eu
      }

      if (!response.ok) {
        throw new Error(
          `WalletStorageClient rpcCall: network error ${response.status} ${response.statusText}`
        )
      }

      const json = await response.json()
      if (json.error) {
        const { code, message, data } = json.error
        const err = new Error(`RPC Error: ${message}`)
          // You could attach more info here if you like:
          ; (err as any).code = code
          ; (err as any).data = data
        throw err
      }

      return json.result

    } catch (eu: unknown) {
      throw eu
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // In a real environment, you might do lazy or real "makeAvailable" logic
  // For demonstration, we assume that the remote store might return its "settings"
  // and we store them locally in `this.settings`.
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @returns true once storage `TableSettings` have been retreived from remote storage.
   */
  isAvailable(): boolean {
    // We'll just say "yes" if we have settings
    return !!this.settings
  }

  /**
   * @returns remote storage `TableSettings` if they have been retreived by `makeAvailable`.
   * @throws WERR_INVALID_OPERATION if `makeAvailable` has not yet been called.
   */
  getSettings(): TableSettings {
    if (!this.settings) {
      throw new sdk.WERR_INVALID_OPERATION(
        'call makeAvailable at least once before getSettings'
      )
    }
    return this.settings
  }

  /**
   * Must be called prior to making use of storage.
   * Retreives `TableSettings` from remote storage provider.
   * @returns remote storage `TableSettings`
   */
  async makeAvailable(): Promise<TableSettings> {
    if (!this.settings) {
      this.settings = await this.rpcCall<TableSettings>('makeAvailable', [])
    }
    return this.settings
  }

  //////////////////////////////////////////////////////////////////////////////
  //
  // Implementation of all WalletStorage interface methods
  // They are simple pass-thrus to rpcCall
  //
  // IMPORTANT: The parameter ordering must match exactly as in your interface.
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Called to cleanup resources when no further use of this object will occur.
   */
  async destroy(): Promise<void> {
    return this.rpcCall<void>('destroy', [])
  }

  /**
   * Requests schema migration to latest.
   * Typically remote storage will ignore this request.
   * @param storageName Unique human readable name for remote storage if it does not yet exist.
   * @param storageIdentityKey Unique identity key for remote storage if it does not yet exist.
   * @returns current schema migration identifier
   */
  async migrate(
    storageName: string,
    storageIdentityKey: string
  ): Promise<string> {
    return this.rpcCall<string>('migrate', [storageName])
  }

  /**
   * Remote storage does not offer `Services` to remote clients.
   * @throws WERR_INVALID_OPERATION
   */
  getServices(): sdk.WalletServices {
    // Typically, the client would not store or retrieve "Services" from a remote server.
    // The "services" in local in-memory usage is a no-op or your own approach:
    throw new sdk.WERR_INVALID_OPERATION(
      'getServices() not implemented in remote client. This method typically is not used remotely.'
    )
  }

  /**
   * Ignored. Remote storage cannot share `Services` with remote clients.
   */
  setServices(v: sdk.WalletServices): void {
    // Typically no-op for remote client
    // Because "services" are usually local definitions to the Storage.
  }

  /**
   * Storage level processing for wallet `internalizeAction`.
   * Updates internalized outputs in remote storage.
   * Triggers proof validation of containing transaction.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args Original wallet `internalizeAction` arguments.
   * @returns `internalizeAction` results
   */
  async internalizeAction(
    auth: sdk.AuthId,
    args: InternalizeActionArgs
  ): Promise<InternalizeActionResult> {
    return this.rpcCall<InternalizeActionResult>('internalizeAction', [
      auth,
      args
    ])
  }

  /**
   * Storage level processing for wallet `createAction`.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args Validated extension of original wallet `createAction` arguments.
   * @returns `StorageCreateActionResults` supporting additional wallet processing to yield `createAction` results.
   */
  async createAction(
    auth: sdk.AuthId,
    args: sdk.ValidCreateActionArgs
  ): Promise<sdk.StorageCreateActionResult> {
    return this.rpcCall<sdk.StorageCreateActionResult>('createAction', [
      auth,
      args
    ])
  }

  /**
   * Storage level processing for wallet `createAction` and `signAction`.
   *
   * Handles remaining storage tasks once a fully signed transaction has been completed. This is common to both `createAction` and `signAction`.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args `StorageProcessActionArgs` convey completed signed transaction to storage.
   * @returns `StorageProcessActionResults` supporting final wallet processing to yield `createAction` or `signAction` results.
   */
  async processAction(
    auth: sdk.AuthId,
    args: sdk.StorageProcessActionArgs
  ): Promise<sdk.StorageProcessActionResults> {
    return this.rpcCall<sdk.StorageProcessActionResults>('processAction', [
      auth,
      args
    ])
  }

  /**
   * Aborts an action by `reference` string.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args original wallet `abortAction` args.
   * @returns `abortAction` result.
   */
  async abortAction(
    auth: sdk.AuthId,
    args: AbortActionArgs
  ): Promise<AbortActionResult> {
    return this.rpcCall<AbortActionResult>('abortAction', [auth, args])
  }

  /**
   * Used to both find and initialize a new user by identity key.
   * It is up to the remote storage whether to allow creation of new users by this method.
   * @param identityKey of the user.
   * @returns `TableUser` for the user and whether a new user was created.
   */
  async findOrInsertUser(
    identityKey
  ): Promise<{ user: TableUser; isNew: boolean }> {
    return this.rpcCall<{ user: TableUser; isNew: boolean }>(
      'findOrInsertUser',
      [identityKey]
    )
  }

  /**
   * Used to both find and insert a `TableSyncState` record for the user to track wallet data replication across storage providers.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param storageName the name of the remote storage being sync'd
   * @param storageIdentityKey the identity key of the remote storage being sync'd
   * @returns `TableSyncState` and whether a new record was created.
   */
  async findOrInsertSyncStateAuth(
    auth: sdk.AuthId,
    storageIdentityKey: string,
    storageName: string
  ): Promise<{ syncState: TableSyncState; isNew: boolean }> {
    return this.rpcCall<{ syncState: TableSyncState; isNew: boolean }>(
      'findOrInsertSyncStateAuth',
      [auth, storageIdentityKey, storageName]
    )
  }

  /**
   * Inserts a new certificate with fields and keyring into remote storage.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param certificate the certificate to insert.
   * @returns record Id of the inserted `TableCertificate` record.
   */
  async insertCertificateAuth(
    auth: sdk.AuthId,
    certificate: TableCertificateX
  ): Promise<number> {
    return this.rpcCall<number>('insertCertificateAuth', [auth, certificate])
  }

  /**
   * Storage level processing for wallet `listActions`.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args Validated extension of original wallet `listActions` arguments.
   * @returns `listActions` results.
   */
  async listActions(
    auth: sdk.AuthId,
    vargs: sdk.ValidListActionsArgs
  ): Promise<ListActionsResult> {
    return this.rpcCall<ListActionsResult>('listActions', [auth, vargs])
  }

  /**
   * Storage level processing for wallet `listOutputs`.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args Validated extension of original wallet `listOutputs` arguments.
   * @returns `listOutputs` results.
   */
  async listOutputs(
    auth: sdk.AuthId,
    vargs: sdk.ValidListOutputsArgs
  ): Promise<ListOutputsResult> {
    return this.rpcCall<ListOutputsResult>('listOutputs', [auth, vargs])
  }

  /**
   * Storage level processing for wallet `listCertificates`.
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args Validated extension of original wallet `listCertificates` arguments.
   * @returns `listCertificates` results.
   */
  async listCertificates(
    auth: sdk.AuthId,
    vargs: sdk.ValidListCertificatesArgs
  ): Promise<ListCertificatesResult> {
    return this.rpcCall<ListCertificatesResult>('listCertificates', [
      auth,
      vargs
    ])
  }

  /**
   * Find user certificates, optionally with fields.
   *
   * This certificate retrieval method supports internal wallet operations.
   * Field values are stored and retrieved encrypted.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args `FindCertificatesArgs` determines which certificates to retrieve and whether to include fields.
   * @returns array of certificates matching args.
   */
  async findCertificatesAuth(
    auth: sdk.AuthId,
    args: sdk.FindCertificatesArgs
  ): Promise<TableCertificateX[]> {
    return this.rpcCall<TableCertificate[]>('findCertificatesAuth', [
      auth,
      args
    ])
  }

  /**
   * Find output baskets.
   *
   * This retrieval method supports internal wallet operations.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args `FindOutputBasketsArgs` determines which baskets to retrieve.
   * @returns array of output baskets matching args.
   */
  async findOutputBasketsAuth(
    auth: sdk.AuthId,
    args: sdk.FindOutputBasketsArgs
  ): Promise<TableOutputBasket[]> {
    return this.rpcCall<TableOutputBasket[]>('findOutputBaskets', [auth, args])
  }

  /**
   * Find outputs.
   *
   * This retrieval method supports internal wallet operations.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args `FindOutputsArgs` determines which outputs to retrieve.
   * @returns array of outputs matching args.
   */
  async findOutputsAuth(
    auth: sdk.AuthId,
    args: sdk.FindOutputsArgs
  ): Promise<TableOutput[]> {
    return this.rpcCall<TableOutput[]>('findOutputsAuth', [auth, args])
  }

  /**
   * Find requests for transaction proofs.
   *
   * This retrieval method supports internal wallet operations.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args `FindProvenTxReqsArgs` determines which proof requests to retrieve.
   * @returns array of proof requests matching args.
   */
  findProvenTxReqs(
    args: sdk.FindProvenTxReqsArgs
  ): Promise<TableProvenTxReq[]> {
    return this.rpcCall<TableProvenTxReq[]>('findProvenTxReqs', [args])
  }

  /**
   * Relinquish a certificate.
   *
   * For storage supporting replication records must be kept of deletions. Therefore certificates are marked as deleted
   * when relinquished, and no longer returned by `listCertificates`, but are still retained by storage.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args original wallet `relinquishCertificate` args.
   */
  async relinquishCertificate(
    auth: sdk.AuthId,
    args: RelinquishCertificateArgs
  ): Promise<number> {
    return this.rpcCall<number>('relinquishCertificate', [auth, args])
  }

  /**
   * Relinquish an output.
   *
   * Relinquishing an output removes the output from whatever basket was tracking it.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param args original wallet `relinquishOutput` args.
   */
  async relinquishOutput(
    auth: sdk.AuthId,
    args: RelinquishOutputArgs
  ): Promise<number> {
    return this.rpcCall<number>('relinquishOutput', [auth, args])
  }

  /**
   * Process a "chunk" of replication data for the user.
   *
   * The normal data flow is for the active storage to push backups as a sequence of data chunks to backup storage providers.
   *
   * @param args a copy of the replication request args that initiated the sequence of data chunks.
   * @param chunk the current data chunk to process.
   * @returns whether processing is done, counts of inserts and udpates, and related progress tracking properties.
   */
  async processSyncChunk(
    args: sdk.RequestSyncChunkArgs,
    chunk: sdk.SyncChunk
  ): Promise<sdk.ProcessSyncChunkResult> {
    return this.rpcCall<sdk.ProcessSyncChunkResult>('processSyncChunk', [
      args,
      chunk
    ])
  }

  /**
   * Request a "chunk" of replication data for a specific user and storage provider.
   *
   * The normal data flow is for the active storage to push backups as a sequence of data chunks to backup storage providers.
   * Also supports recovery where non-active storage can attempt to merge available data prior to becoming active.
   *
   * @param args that identify the non-active storage which will receive replication data and constrains the replication process.
   * @returns the next "chunk" of replication data
   */
  async getSyncChunk(args: sdk.RequestSyncChunkArgs): Promise<sdk.SyncChunk> {
    return this.rpcCall<sdk.SyncChunk>('getSyncChunk', [args])
  }

  /**
   * Handles the data received when a new transaction proof is found in response to an outstanding request for proof data:
   *
   *   - Creates a new `TableProvenTx` record.
   *   - Notifies all user transaction records of the new status.
   *   - Updates the proof request record to 'completed' status which enables delayed deletion.
   *
   * @param args proof request and new transaction proof data
   * @returns results of updates
   */
  async updateProvenTxReqWithNewProvenTx(
    args: sdk.UpdateProvenTxReqWithNewProvenTxArgs
  ): Promise<sdk.UpdateProvenTxReqWithNewProvenTxResult> {
    return this.rpcCall<sdk.UpdateProvenTxReqWithNewProvenTxResult>(
      'updateProvenTxReqWithNewProvenTx',
      [args]
    )
  }

  /**
   * Ensures up-to-date wallet data replication to all configured backup storage providers,
   * then promotes one of the configured backups to active,
   * demoting the current active to new backup.
   *
   * @param auth Identifies client by identity key and the storage identity key of their currently active storage.
   * This must match the `AuthFetch` identity securing the remote conneciton.
   * @param newActiveStorageIdentityKey which must be a currently configured backup storage provider.
   */
  async setActive(
    auth: sdk.AuthId,
    newActiveStorageIdentityKey: string
  ): Promise<number> {
    return this.rpcCall<number>('setActive', [
      auth,
      newActiveStorageIdentityKey
    ])
  }
}
