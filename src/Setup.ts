import { KeyDeriver, PrivateKey } from '@bsv/sdk'
import {
  Monitor,
  sdk,
  Services,
  SetupClient,
  Wallet,
  WalletStorageManager
} from './index.client'
import { Knex, knex as makeKnex } from 'knex'
import { SetupWallet, SetupWalletArgs, StorageKnex } from './index.all'

/**
 * The 'Setup` class provides static setup functions to construct BRC-100 compatible
 * wallets in a variety of configurations.
 *
 * It serves as a starting point for experimentation and customization.
 *
 * `SetupClient` references only browser compatible code including storage via `StorageClient`.
 * `Setup` extends `SetupClient` adding database storage via `Knex` and `StorageKnex`.
 *
 */
export abstract class Setup extends SetupClient {

  /**
   * Adds `Knex` based storage to a `Wallet` configured by `Setup.createWalletOnly`
   *
   * @param args.knex `Knex` object configured for either MySQL or SQLite database access.
   * Schema will be created and migrated as needed.
   * For MySQL, a schema corresponding to databaseName must exist with full access permissions.
   * @param args.databaseName Name for this storage. For MySQL, the schema name within the MySQL instance.
   * @param args.chain Which chain this wallet is on: 'main' or 'test'. Defaults to 'test'.
   * @param args.rootKeyHex
   *
   * @publicbody
   */
  static async createWalletKnex(
    args: SetupWalletKnexArgs
  ): Promise<SetupWalletKnex> {
    const wo = await Setup.createWallet(args)
    const activeStorage = new StorageKnex({
      chain: wo.chain,
      knex: args.knex,
      commissionSatoshis: 0,
      commissionPubKeyHex: undefined,
      feeModel: { model: 'sat/kb', value: 1 }
    })
    await activeStorage.migrate(args.databaseName, wo.identityKey)
    await activeStorage.makeAvailable()
    await wo.storage.addWalletStorageProvider(activeStorage)
    const { user, isNew } = await activeStorage.findOrInsertUser(wo.identityKey)
    const userId = user.userId
    const r: SetupWalletKnex = {
      ...wo,
      activeStorage,
      userId
    }
    return r
  }

  /**
   * @publicbody
   */
  static createSQLiteKnex(filename: string): Knex {
    const config: Knex.Config = {
      client: 'sqlite3',
      connection: { filename },
      useNullAsDefault: true
    }
    const knex = makeKnex(config)
    return knex
  }

  /**
   * @publicbody
   */
  static createMySQLKnex(connection: string, database?: string): Knex {
    const c: Knex.MySql2ConnectionConfig = JSON.parse(connection)
    if (database) {
      c.database = database
    }
    const config: Knex.Config = {
      client: 'mysql2',
      connection: c,
      useNullAsDefault: true,
      pool: { min: 0, max: 7, idleTimeoutMillis: 15000 }
    }
    const knex = makeKnex(config)
    return knex
  }

  /**
   * @publicbody
   */
  static async createWalletMySQL(
    args: SetupWalletMySQLArgs
  ): Promise<SetupWalletKnex> {
    return await this.createWalletKnex({
      ...args,
      knex: Setup.createMySQLKnex(args.env.mySQLConnection, args.databaseName)
    })
  }

  /**
   * @publicbody
   */
  static async createWalletSQLite(
    args: SetupWalletSQLiteArgs
  ): Promise<SetupWalletKnex> {
    return await this.createWalletKnex({
      ...args,
      knex: Setup.createSQLiteKnex(args.filePath)
    })
  }
}

/**
 *
 */
export interface SetupWalletKnexArgs extends SetupWalletArgs {
  knex: Knex<any, any[]>
  databaseName: string
}

/**
 *
 */
export interface SetupWalletMySQLArgs extends SetupWalletArgs {
  databaseName: string
}

/**
 *
 */
export interface SetupWalletSQLiteArgs extends SetupWalletArgs {
  filePath: string
  databaseName: string
}

/**
 *
 */
export interface SetupWalletKnex extends SetupWallet {
  activeStorage: StorageKnex
  userId: number

  rootKey: PrivateKey
  identityKey: string
  keyDeriver: KeyDeriver
  chain: sdk.Chain
  storage: WalletStorageManager
  services: Services
  monitor: Monitor
  wallet: Wallet
}
