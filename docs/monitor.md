# MONITOR: BSV Wallet Toolbox API Documentation

The documentation is split into various pages, this page covers the [WalletMonitor](#class-walletmonitor) and related API.

To function properly, a wallet must be able to perform a number of house keeping tasks:

1. Ensure transactions are sent to the network without slowing application flow or when created while offline.
1. Obtain and merge proofs when transactions are mined.
1. Detect and propagate transactions that fail due to double-spend, reorgs, or other reasons.

These tasks are the responssibility of the [WalletMonitor](#class-walletmonitor) class.

[Return To Top](./README.md)

<!--#region ts2md-api-merged-here-->
<!--#endregion ts2md-api-merged-here-->