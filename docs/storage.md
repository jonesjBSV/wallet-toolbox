# STORAGE: BSV Wallet Toolbox API Documentation

The documentation is split into various pages, this page covers the persistent storage of wallet data: transactions, outputs and metadata.

The [WalletStorageManager](#class-walletstoragemanager) class manages a collection of storage providers of which one is the "active" storage
at any one time, and the rest are backups. It manages access to wallet data, pushing incremental updates to backups, and switching the active
to what was previously a backup.

The [StorageClient](#class-storageclient) implements a cloud based storage provider via JSON-RPC. The [StorageServer](#class-storageserver) class
and `@bsv/wallet-infra` package can be used to host such a JSON-RPC server.

The [StorageKnex](#class-storageknex) class implements `Knex` based database storage with explicit support for both MySQL and SQLite.

[Return To Top](./README.md)

<!--#region ts2md-api-merged-here-->
<!--#endregion ts2md-api-merged-here-->