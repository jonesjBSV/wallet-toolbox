import * as bsv from '@bsv/sdk'
import { _tu, TestSetup1 } from '../utils/TestUtilsWalletStorage'
import { sdk, StorageProvider, StorageKnex, table, verifyOne } from '../../src/index.all'
import { normalizeDate, setLogging, triggerForeignKeyConstraintError, triggerUniqueConstraintError, updateTable, validateUpdateTime, verifyValues } from '../utils/TestUtilsWalletStorage'
import { ProvenTx, ProvenTxReq, User, Certificate, CertificateField, OutputBasket, Transaction, Commission, Output, OutputTag, OutputTagMap, TxLabel, TxLabelMap, MonitorEvent, SyncState } from '../../src/storage/schema/tables'

setLogging(false)

describe('update tests', () => {
  jest.setTimeout(99999999)

  const storages: StorageProvider[] = []
  const chain: sdk.Chain = 'test'
  const setups: { setup: TestSetup1; storage: StorageProvider }[] = []
  const env = _tu.getEnv(chain)
  const databaseName = 'updateTest'

  beforeAll(async () => {
    const localSQLiteFile = await _tu.newTmpFile(`${databaseName}.sqlite`, false, false, true)
    const knexSQLite = _tu.createLocalSQLite(localSQLiteFile)
    storages.push(new StorageKnex({ ...StorageKnex.defaultOptions(), chain, knex: knexSQLite }))
    if (!env.noMySQL) {
      const knexMySQL = _tu.createLocalMySQL(`${databaseName}.mysql`)
      storages.push(new StorageKnex({ ...StorageKnex.defaultOptions(), chain, knex: knexMySQL }))
    }
    for (const storage of storages) {
      await storage.dropAllData()
      await storage.migrate('insert tests', '1'.repeat(64))
      setups.push({ storage, setup: await _tu.createTestSetup1(storage) })
    }
  })

  afterAll(async () => {
    for (const storage of storages) {
      await storage.destroy()
    }
  })

  test('1_update ProvenTx', async () => {
    for (const { storage } of setups) {
      const records = await storage.findProvenTxs({ partial: {} })
      const time = new Date('2001-01-02T12:00:00.000Z')
      for (const record of records) {
        await storage.updateProvenTx(record.provenTxId, { blockHash: 'fred', updated_at: time })
        const t = verifyOne(await storage.findProvenTxs({ partial: { provenTxId: record.provenTxId } }))
        expect(t.provenTxId).toBe(record.provenTxId)
        expect(t.blockHash).toBe('fred')
        expect(t.updated_at.getTime()).toBe(time.getTime())
      }
    }
  })

  test('2_update ProvenTx', async () => {
    const primaryKey = 'provenTxId'
    for (const { storage } of setups) {
      const referenceTime = new Date()
      const records = await storage.findProvenTxs({ partial: {} })
      for (const record of records) {
        try {
          const testValues: ProvenTx = {
            provenTxId: record.provenTxId,
            txid: 'mockTxid',
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            blockHash: 'mockBlockHash',
            height: 12345,
            index: 1,
            merklePath: [1, 2, 3, 4],
            merkleRoot: '1234',
            rawTx: [4, 3, 2, 1]
          }
          await updateTable(storage.updateProvenTx.bind(storage), record[primaryKey], testValues)
          const updatedTx = verifyOne(await storage.findProvenTxs({ partial: { [primaryKey]: record[primaryKey] } }))
          verifyValues(updatedTx, testValues, referenceTime)
          for (const [key, value] of Object.entries(testValues)) {
            if (key === primaryKey) {
              continue
            }
            if (typeof value === 'string') {
              const validString = `valid${key}`
              const r1 = await storage.updateProvenTx(record[primaryKey], { [key]: validString })
              expect(r1).toBe(1)
              const updatedRow = verifyOne(await storage.findProvenTxs({ partial: { [primaryKey]: record[primaryKey] } }))
              expect(updatedRow[key]).toBe(validString)
            }
            if (typeof value === 'number') {
              const validNumber = value + 1
              const r1 = await storage.updateProvenTx(record[primaryKey], { [key]: validNumber })
              expect(r1).toBe(1)
              const updatedRow = verifyOne(await storage.findProvenTxs({ partial: { [primaryKey]: record[primaryKey] } }))
              expect(updatedRow[key]).toBe(validNumber)
            }
            if (value instanceof Date) {
              const validDate = new Date('2024-12-31T00:00:00Z')
              const r1 = await storage.updateProvenTx(record[primaryKey], { [key]: validDate })
              expect(r1).toBe(1)
              const updatedRow = verifyOne(await storage.findProvenTxs({ partial: { [primaryKey]: record[primaryKey] } }))
              expect(new Date(updatedRow[key]).toISOString()).toBe(validDate.toISOString())
            }
            if (Array.isArray(value)) {
              const validArray = value.map(v => v + 1)
              const r1 = await storage.updateProvenTx(record[primaryKey], { [key]: validArray })
              expect(r1).toBe(1)
              const updatedRow = verifyOne(await storage.findProvenTxs({ partial: { [primaryKey]: record[primaryKey] } }))
              expect(updatedRow[key]).toEqual(validArray)
            }
          }
        } catch (error: any) {
          console.error(`Error updating or verifying ProvenTx record with ${primaryKey}=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('3_update ProvenTx set created_at and updated_at time', async () => {
    for (const { storage } of setups) {
      const scenarios = [
        {
          description: 'Invalid created_at time',
          updates: {
            created_at: new Date('3000-01-01T00:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        },
        {
          description: 'Invalid updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('3000-01-01T00:00:00Z')
          }
        },
        {
          description: 'created_at time overwrites updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        }
      ]
      for (const { updates } of scenarios) {
        const referenceTime = new Date()
        const records = await storage.findProvenTxs({ partial: {} })
        for (const record of records) {
          await storage.updateProvenTx(record.provenTxId, { created_at: updates.created_at })
          await storage.updateProvenTx(record.provenTxId, { updated_at: updates.updated_at })
          const t = verifyOne(await storage.findProvenTxs({ partial: { provenTxId: record.provenTxId } }))
          expect(validateUpdateTime(t.created_at, updates.created_at, referenceTime, 10, false)).toBe(true)
          expect(validateUpdateTime(t.updated_at, updates.updated_at, referenceTime, 10, false)).toBe(true)
        }
      }
    }
  })

  test('4_update ProvenTx setting individual values', async () => {
    for (const { storage } of setups) {
      const initialRecord: ProvenTx = {
        provenTxId: 3,
        txid: 'mockTxid',
        created_at: new Date(),
        updated_at: new Date(),
        blockHash: '',
        height: 1,
        index: 1,
        merklePath: [],
        merkleRoot: '',
        rawTx: []
      }
      try {
        const r = await storage.insertProvenTx(initialRecord)
        expect(r).toBeGreaterThan(0)
        const insertedRecords = await storage.findProvenTxs({ partial: {} })
        expect(insertedRecords.length).toBeGreaterThan(0)
        const foundRecord = insertedRecords.find(record => record.provenTxId === 3)
        expect(foundRecord).toBeDefined()
        expect(foundRecord?.txid).toBe('mockTxid')
      } catch (error: any) {
        console.error('Error inserting initial record:', (error as Error).message)
        return
      }
      await expect(storage.updateProvenTx(1, { provenTxId: 0 })).rejects.toThrow(/FOREIGN KEY constraint failed/)
      const r1 = await storage.updateProvenTx(3, { provenTxId: 0 })
      await expect(Promise.resolve(r1)).resolves.toBe(1)
      const r2 = await storage.findProvenTxs({ partial: {} })
      expect(r2[0].provenTxId).toBe(0)
      expect(r2[1].provenTxId).toBe(1)
      const r3 = await storage.updateProvenTx(0, { provenTxId: 3 })
      await expect(Promise.resolve(r3)).resolves.toBe(1)
      const r4 = await storage.findProvenTxs({ partial: {} })
      expect(r4[0].provenTxId).toBe(1)
      expect(r4[1].provenTxId).toBe(3)
      const r8 = await storage.updateProvenTx(3, { txid: 'mockValidTxid' })
      await expect(Promise.resolve(r8)).resolves.toBe(1)
      const r9 = await storage.findProvenTxs({ partial: {} })
      expect(r9.find(r => r.provenTxId === 3)?.txid).toBe('mockValidTxid')
    }
  })

  test('5_update ProvenTxReq', async () => {
    const primaryKey = 'provenTxReqId'
    for (const { storage } of setups) {
      const records = await storage.findProvenTxReqs({ partial: {} })
      for (const record of records) {
        try {
          const testValues: ProvenTxReq = {
            provenTxReqId: record.provenTxReqId,
            provenTxId: 1,
            batch: `batch-001`,
            status: 'completed',
            txid: `mockTxid-${Date.now()}`,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            attempts: 3,
            history: JSON.stringify({ validated: true, timestamp: Date.now() }),
            inputBEEF: [5, 6, 7, 8],
            notified: true,
            notify: JSON.stringify({ email: 'test@example.com', sent: true }),
            rawTx: [1, 2, 3, 4]
          }
          const r1 = await storage.updateProvenTxReq(record[primaryKey], testValues)
          expect(r1).toBe(1)
          const updatedRow = verifyOne(await storage.findProvenTxReqs({ partial: { [primaryKey]: record[primaryKey] } }))
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
              expect(JSON.parse(actualValue)).toStrictEqual(JSON.parse(value))
              continue
            }
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              expect(actualValue).toBe(value)
              continue
            }
            if (typeof actualValue === 'object' && actualValue?.type === 'Buffer') {
              const actualArray = actualValue.data || actualValue
              const expectedArray = Buffer.isBuffer(value) || Array.isArray(value) ? Array.from(value as ArrayLike<number>) : value
              expect(actualArray).toStrictEqual(expectedArray)
              continue
            }
            expect(JSON.stringify({ type: 'Buffer', data: actualValue })).toStrictEqual(JSON.stringify(value))
          }
        } catch (error: any) {
          console.error(`Error updating or verifying ProvenTxReq record with ${primaryKey}=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('6_update ProvenTxReq set created_at and updated_at time', async () => {
    for (const { storage } of setups) {
      const scenarios = [
        {
          description: 'Invalid created_at time',
          updates: {
            created_at: new Date('3000-01-01T00:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        },
        {
          description: 'Invalid updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('3000-01-01T00:00:00Z')
          }
        },
        {
          description: 'created_at time overwrites updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        }
      ]
      for (const { updates } of scenarios) {
        const referenceTime = new Date()
        const records = await storage.findProvenTxReqs({ partial: {} })
        for (const record of records) {
          await storage.updateProvenTxReq(record.provenTxReqId, { created_at: updates.created_at })
          await storage.updateProvenTxReq(record.provenTxReqId, { updated_at: updates.updated_at })
          const t = verifyOne(await storage.findProvenTxReqs({ partial: { provenTxReqId: record.provenTxReqId } }))
          expect(validateUpdateTime(t.created_at, updates.created_at, referenceTime)).toBe(true)
          expect(validateUpdateTime(t.updated_at, updates.updated_at, referenceTime)).toBe(true)
        }
      }
    }
  })

  test('7_update ProvenTxReq setting individual values', async () => {
    for (const { storage } of setups) {
      const referenceTime = new Date()
      const initialRecord: ProvenTxReq = {
        provenTxReqId: 3,
        provenTxId: 1,
        batch: 'batch',
        status: 'nosend',
        txid: 'mockTxid1',
        created_at: referenceTime,
        updated_at: referenceTime,
        attempts: 0,
        history: '{}',
        inputBEEF: [],
        notified: false,
        notify: '{}',
        rawTx: []
      }
      await storage.insertProvenTxReq(initialRecord)
      const secondRecord: ProvenTxReq = {
        ...initialRecord,
        provenTxReqId: 4,
        txid: 'mockTxid2'
      }
      await storage.insertProvenTxReq(secondRecord)
      const recordToUpdate3 = await storage.findProvenTxReqs({ partial: { provenTxReqId: 3 } })
      expect(recordToUpdate3.length).toBeGreaterThan(0)
      const recordToUpdate4 = await storage.findProvenTxReqs({ partial: { provenTxReqId: 4 } })
      expect(recordToUpdate4.length).toBeGreaterThan(0)
      const r3 = await storage.updateProvenTxReq(3, { batch: 'updatedBatch' })
      await expect(Promise.resolve(r3)).resolves.toBe(1)
      const updatedRecords = await storage.findProvenTxReqs({ partial: {} })
      const updatedBatch = updatedRecords.find(r => r.provenTxReqId === 3)?.batch
      expect(updatedBatch).toBe('updatedBatch')
      try {
        const r4 = await storage.updateProvenTxReq(4, { batch: 'updatedBatch' })
        if (r4 === 0) {
          console.warn('No rows updated. Ensure UNIQUE constraint exists on the batch column if rejection is expected.')
        } else {
          await expect(Promise.resolve(r4)).resolves.toBe(1)
        }
      } catch (error: any) {
        expect(error.message).toMatch(/UNIQUE constraint failed/)
      }
      const r5 = await storage.updateProvenTxReq(3, { txid: 'newValidTxid' })
      await expect(Promise.resolve(r5)).resolves.toBe(1)
      await expect(storage.updateProvenTxReq(4, { txid: 'newValidTxid' })).rejects.toThrow(/UNIQUE constraint failed/)
      const finalRecords = await storage.findProvenTxReqs({ partial: {} })
      expect(finalRecords.find(r => r.provenTxReqId === 4)?.txid).toBe('mockTxid2')
      await storage.updateProvenTxReq(3, { batch: 'batch', txid: 'mockTxid1' })
    }
  })

  test('8_update User', async () => {
    const primaryKey = 'userId'
    for (const { storage } of setups) {
      const records = await storage.findUsers({ partial: {} })
      for (const record of records) {
        try {
          const testValues: User = {
            userId: record.userId,
            identityKey: `mockUpdatedIdentityKey-${record[primaryKey]}`,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
          const updateResult = await storage.updateUser(record[primaryKey], testValues)
          expect(updateResult).toBe(1)
          const updatedRow = verifyOne(await storage.findUsers({ partial: { [primaryKey]: record[primaryKey] } }))
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying User record with ${primaryKey}=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('9_update User set created_at and updated_at time', async () => {
    for (const { storage } of setups) {
      const scenarios = [
        {
          description: 'Invalid created_at time',
          updates: {
            created_at: new Date('3000-01-01T00:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        },
        {
          description: 'Invalid updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('3000-01-01T00:00:00Z')
          }
        },
        {
          description: 'created_at time overwrites updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        }
      ]
      for (const { description, updates } of scenarios) {
        const referenceTime = new Date()
        const records = await storage.findUsers({ partial: {} })
        for (const record of records) {
          await storage.updateUser(record.userId, { created_at: updates.created_at })
          await storage.updateUser(record.userId, { updated_at: updates.updated_at })
          const t = verifyOne(await storage.findUsers({ partial: { userId: record.userId } }))
          expect(validateUpdateTime(t.created_at, updates.created_at, referenceTime)).toBe(true)
          expect(validateUpdateTime(t.updated_at, updates.updated_at, referenceTime)).toBe(true)
        }
      }
    }
  })

  test('10_update User trigger DB unique constraint errors', async () => {
    for (const { storage } of setups) {
      try {
        const r = await storage.updateUser(2, { identityKey: 'mockDupIdentityKey' })
        await expect(Promise.resolve(r)).resolves.toBe(1)
      } catch (error: any) {
        console.error('Error updating second record:', error.message)
        return
      }
      const r1 = await triggerUniqueConstraintError(storage, 'findUsers', 'updateUser', 'users', 'userId', { userId: 2 })
      await expect(Promise.resolve(r1)).resolves.toBe(true)
      const r2 = await triggerUniqueConstraintError(storage, 'findUsers', 'updateUser', 'users', 'userId', { identityKey: 'mockDupIdentityKey' })
      await expect(Promise.resolve(r2)).resolves.toBe(true)
      const r3 = await triggerUniqueConstraintError(storage, 'findUsers', 'updateUser', 'users', 'userId', { identityKey: 'mockUniqueIdentityKey' })
      await expect(Promise.resolve(r3)).resolves.toBe(false)
    }
  })

  test('11_update User trigger DB foreign key constraint errors', async () => {
    for (const { storage } of setups) {
      const r1 = await triggerForeignKeyConstraintError(storage, 'findUsers', 'updateUser', 'users', 'userId', { userId: 0 })
      await expect(Promise.resolve(r1)).resolves.toBe(true)
      const r2 = await triggerForeignKeyConstraintError(storage, 'findUsers', 'updateUser', 'users', 'userId', { userId: 3 }, 0)
      await expect(Promise.resolve(r2)).resolves.toBe(false)
    }
  })

  test('12_update User table setting individual values', async () => {
    for (const { storage } of setups) {
      const initialRecord: table.User = {
        userId: 3,
        identityKey: '',
        created_at: new Date(),
        updated_at: new Date()
      }
      try {
        const r = await storage.insertUser(initialRecord)
        expect(r).toBeGreaterThan(1)
      } catch (error: any) {
        console.error('Error inserting initial record:', error.message)
        return
      }
      await expect(storage.updateUser(1, { userId: 0 })).rejects.toThrow(/FOREIGN KEY constraint failed/)
      await expect(storage.updateUser(2, { userId: 0 })).rejects.toThrow(/FOREIGN KEY constraint failed/)
      const r1 = await storage.updateUser(3, { userId: 0 })
      await expect(Promise.resolve(r1)).resolves.toBe(1)
      const r2 = await storage.findUsers({ partial: {} })
      expect(r2[0].userId).toBe(0)
      expect(r2[1].userId).toBe(1)
      expect(r2[2].userId).toBe(2)
      const r3 = await storage.updateUser(0, { userId: 3 })
      await expect(Promise.resolve(r3)).resolves.toBe(1)
      const r4 = await storage.findUsers({ partial: {} })
      expect(r4[0].userId).toBe(1)
      expect(r4[1].userId).toBe(2)
      expect(r4[2].userId).toBe(3)
      const r5 = await storage.updateUser(3, { userId: 9999 })
      await expect(Promise.resolve(r5)).resolves.toBe(1)
      const r6 = await storage.findUsers({ partial: {} })
      expect(r6[0].userId).toBe(1)
      expect(r6[1].userId).toBe(2)
      expect(r6[2].userId).toBe(9999)
      await expect(storage.updateUser(1, { userId: 9999 })).rejects.toThrow(/UNIQUE constraint failed/)
      const r7 = await storage.findUsers({ partial: {} })
      expect(r7[0].userId).toBe(1)
      expect(r7[1].userId).toBe(2)
      expect(r7[2].userId).toBe(9999)
      const r8 = await storage.updateUser(9999, { identityKey: 'mockValidIdentityKey' })
      await expect(Promise.resolve(r8)).resolves.toBe(1)
      const r9 = await storage.findUsers({ partial: {} })
      expect(r9[0].identityKey).not.toBe('mockValidIdentityKey')
      expect(r9[1].identityKey).not.toBe('mockValidIdentityKey')
      expect(r9[2].identityKey).toBe('mockValidIdentityKey')
      await expect(storage.updateUser(2, { identityKey: 'mockValidIdentityKey' })).rejects.toThrow(/UNIQUE constraint failed/)
      const r10 = await storage.findUsers({ partial: {} })
      expect(r10[0].identityKey).not.toBe('mockValidIdentityKey')
      expect(r10[1].identityKey).not.toBe('mockValidIdentityKey')
      expect(r10[2].identityKey).toBe('mockValidIdentityKey')
      const r11 = await storage.updateUser(9999, { userId: 3 })
      await expect(Promise.resolve(r11)).resolves.toBe(1)
      const r12 = await storage.findUsers({ partial: {} })
      expect(r12[0].userId).toBe(1)
      expect(r12[1].userId).toBe(2)
      expect(r12[2].userId).toBe(3)
      const createdAt = new Date('2024-12-30T23:00:00Z')
      const updatedAt = new Date('2024-12-30T23:05:00Z')
      const r13 = await storage.updateUser(3, { created_at: createdAt, updated_at: updatedAt })
      await expect(Promise.resolve(r13)).resolves.toBe(1)
      const r14 = await storage.findUsers({ partial: {} })
      const updatedRecord = r14.find(record => record.userId === 3)
      expect(updatedRecord?.created_at).toEqual(createdAt)
      expect(updatedRecord?.updated_at).toEqual(updatedAt)
    }
  })

  test('13_update Certificate', async () => {
    for (const { storage } of setups) {
      const primaryKey = 'certificateId'
      const records = await storage.findCertificates({ partial: {} })
      for (const record of records) {
        try {
          const testValues: Certificate = {
            certificateId: record.certificateId,
            userId: 1,
            certifier: `mockCertifier${record.certificateId}`,
            serialNumber: `mockSerialNumber${record.certificateId}`,
            type: `mockType${record.certificateId}`,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            isDeleted: false,
            revocationOutpoint: 'mockRevocationOutpoint',
            signature: 'mockSignature',
            subject: 'mockSubject'
          }
          const r1 = await storage.updateCertificate(record[primaryKey], testValues)
          expect(r1).toBe(1)
          const updatedRow = verifyOne(await storage.findCertificates({ partial: { [primaryKey]: record[primaryKey] } }))
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
              expect(JSON.parse(actualValue)).toStrictEqual(JSON.parse(value))
              continue
            }
            if (typeof actualValue === 'boolean') {
              if (value === 1) {
                expect(actualValue).toBe(true)
              } else if (value === 0) {
                expect(actualValue).toBe(false)
              } else {
                throw new Error(`Unexpected value for expectedValue: ${value}. Must be 0 or 1.`)
              }
              continue
            }
            if (typeof value === 'string' || typeof value === 'number') {
              expect(actualValue).toBe(value)
              continue
            }
            if (typeof actualValue === 'object' && actualValue?.type === 'Buffer') {
              const actualArray = actualValue.data || actualValue
              const expectedArray = Buffer.isBuffer(value) || Array.isArray(value) ? Array.from(value as ArrayLike<number>) : value
              expect(actualArray).toStrictEqual(expectedArray)
              continue
            }
            expect(JSON.stringify({ type: 'Buffer', data: actualValue })).toStrictEqual(JSON.stringify(value))
          }
        } catch (error: any) {
          console.error(`Error updating or verifying Certificate record with ${primaryKey}=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('14_update Certificate set created_at and updated_at time', async () => {
    for (const { storage } of setups) {
      const scenarios = [
        {
          description: 'Invalid created_at time',
          updates: {
            created_at: new Date('3000-01-01T00:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        },
        {
          description: 'Invalid updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('3000-01-01T00:00:00Z')
          }
        },
        {
          description: 'created_at time overwrites updated_at time',
          updates: {
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z')
          }
        }
      ]
      for (const { updates } of scenarios) {
        const referenceTime = new Date()
        const records = await storage.findCertificates({ partial: {} })
        for (const record of records) {
          await storage.updateUser(record.certificateId, { created_at: updates.created_at })
          await storage.updateUser(record.certificateId, { updated_at: updates.updated_at })
          const t = verifyOne(await storage.findCertificates({ partial: { certificateId: record.certificateId } }))
          expect(validateUpdateTime(t.created_at, updates.created_at, referenceTime)).toBe(true)
          expect(validateUpdateTime(t.updated_at, updates.updated_at, referenceTime)).toBe(true)
        }
      }
    }
  })

  test('15_update Certificate trigger DB unique constraint errors', async () => {
    for (const { storage } of setups) {
      const initMockDupValues = {
        userId: 2,
        type: `mockType2`,
        certifier: `mockCertifier2`,
        serialNumber: `mockSerialNumber2`
      }
      try {
        const r = await storage.updateCertificate(2, initMockDupValues)
        await expect(Promise.resolve(r)).resolves.toBe(1)
      } catch (error: any) {
        console.error('Error updating second record:', error.message)
      }
      const mockDupValues = {
        userId: 2,
        type: `mockType2`,
        certifier: `mockCertifier2`,
        serialNumber: `mockSerialNumber2`
      }
      const mockUniqueValues = {
        userId: 2,
        type: `mockTypeUnique`,
        certifier: `mockCertifier2`,
        serialNumber: `mockSerialNumber2`
      }
      const r1 = await triggerUniqueConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', { certificateId: 2 })
      await expect(Promise.resolve(r1)).resolves.toBe(true)
      const r2 = await triggerUniqueConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', mockDupValues)
      await expect(Promise.resolve(r2)).resolves.toBe(true)
      const r3 = await triggerUniqueConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', mockUniqueValues)
      await expect(Promise.resolve(r3)).resolves.toBe(false)
    }
  })

  test('16_update Certificate trigger DB foreign key constraint errors', async () => {
    for (const { storage } of setups) {
      const r1 = await triggerForeignKeyConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', { certificateId: 0 })
      await expect(Promise.resolve(r1)).resolves.toBe(true)
      const r2 = await triggerForeignKeyConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', { certificateId: 1 }, 0)
      await expect(Promise.resolve(r2)).resolves.toBe(false)
      const r3 = await triggerForeignKeyConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', { userId: 0 })
      await expect(Promise.resolve(r3)).resolves.toBe(true)
      const r4 = await triggerForeignKeyConstraintError(storage, 'findCertificates', 'updateCertificate', 'certificates', 'certificateId', { userId: 1 }, 2)
      await expect(Promise.resolve(r4)).resolves.toBe(false)
    }
  })

  test('17_update CertificateField', async () => {
    const primaryKey = 'certificateId'
    for (const { storage } of setups) {
      const records = await storage.findCertificateFields({ partial: { fieldName: 'bob' } })
      for (const record of records) {
        try {
          const testValues: CertificateField = {
            certificateId: record.certificateId,
            userId: record.userId ?? 1,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            fieldName: record.fieldName || 'defaultFieldName',
            fieldValue: 'your uncle',
            masterKey: 'key'
          }
          const updateResult = await storage.updateCertificateField(record.certificateId, testValues.fieldName, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findCertificateFields({
            partial: { certificateId: record.certificateId, fieldName: testValues.fieldName }
          })
          const updatedRow = verifyOne(updatedRecords, `Updated CertificateField with certificateId=${record.certificateId}, fieldName=${testValues.fieldName} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying CertificateField record with certificateId=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('18_update OutputBasket', async () => {
    const primaryKey = 'basketId'
    for (const { storage } of setups) {
      const records = await storage.findOutputBaskets({ partial: {} })
      for (const record of records) {
        try {
          const testValues: OutputBasket = {
            basketId: record.basketId,
            userId: record.userId ?? 1,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            name: record.name || 'defaultName',
            numberOfDesiredUTXOs: 99,
            minimumDesiredUTXOValue: 5000,
            isDeleted: false
          }
          const updateResult = await storage.updateOutputBasket(record.basketId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findOutputBaskets({
            partial: { basketId: record.basketId, name: testValues.name }
          })
          const updatedRow = verifyOne(updatedRecords, `Updated OutputBasket with basketId=${record.basketId}, name=${testValues.name} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            if (typeof actualValue === 'boolean') {
              if (value === 1) {
                expect(actualValue).toBe(true)
              } else if (value === 0) {
                expect(actualValue).toBe(false)
              } else {
                throw new Error(`Unexpected value for expectedValue: ${value}. Must be 0 or 1.`)
              }
              continue
            }
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying OutputBasket record with basketId=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('19_update Transaction', async () => {
    const primaryKey = 'transactionId'
    for (const { storage } of setups) {
      const records = await storage.findTransactions({ partial: {} })
      for (const record of records) {
        try {
          const testValues: Transaction = {
            transactionId: record.transactionId,
            userId: record.userId ?? 1,
            provenTxId: 1,
            reference: `updated_reference_string_${record.transactionId}==` as bsv.Base64String,
            status: 'confirmed' as sdk.TransactionStatus,
            txid: `updated_txid_example_${record.transactionId}`,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            description: 'Updated transaction description',
            isOutgoing: false,
            lockTime: 600000000,
            satoshis: 20000,
            version: 2
          }
          const updateResult = await storage.updateTransaction(record.transactionId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findTransactions({
            partial: { transactionId: record.transactionId }
          })
          const updatedRow = verifyOne(updatedRecords, `Updated Transaction with transactionId=${record.transactionId} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying Transaction record with transactionId=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('20_update Commission', async () => {
    const primaryKey = 'commissionId'
    for (const { storage } of setups) {
      const records = await storage.findCommissions({ partial: {} })
      for (const record of records) {
        try {
          const testValues: Commission = {
            commissionId: record.commissionId,
            userId: record.userId ?? 1,
            transactionId: record.transactionId ?? 1,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            satoshis: 300,
            keyOffset: `updated_key_offset_${record.commissionId}`,
            isRedeemed: true,
            lockingScript: [1, 2, 3, 4]
          }
          const updateResult = await storage.updateCommission(record.commissionId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findCommissions({
            partial: { commissionId: record.commissionId }
          })
          const updatedRow = verifyOne(updatedRecords, `Updated Commission with commissionId=${record.commissionId} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            if (Buffer.isBuffer(actualValue) || Array.isArray(actualValue)) {
              expect(JSON.stringify({ type: 'Buffer', data: actualValue })).toStrictEqual(JSON.stringify(value))
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying Commission record with commissionId=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('21_update Output', async () => {
    const primaryKey = 'outputId'
    for (const { storage } of setups) {
      const records = await storage.findOutputs({ partial: {} })
      for (const record of records) {
        if (!record.transactionId) record.transactionId = 1
        if (!record.basketId) record.basketId = 1
        if (!record.userId || !record.transactionId || !record.basketId) {
          throw new Error(`Missing required foreign keys for record ${JSON.stringify(record)}`)
        }
      }
      for (const record of records) {
        const existingRecords = await storage.findOutputs({ partial: {} })
        const usedCombinations = new Set(existingRecords.map(r => `${r.transactionId}-${r.vout}-${r.userId}`))
        let testTransactionId = record.transactionId
        let testVout = record.vout + 1
        let testUserId = record.userId
        while (usedCombinations.has(`${testTransactionId}-${testVout}-${testUserId}`)) {
          testVout += 1
        }
        try {
          const testValues: Output = {
            outputId: record.outputId,
            basketId: record.basketId ?? 1,
            transactionId: testTransactionId,
            userId: testUserId,
            vout: testVout,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            change: true,
            customInstructions: 'Updated instructions',
            derivationPrefix: 'updated_prefix==',
            derivationSuffix: 'updated_suffix==',
            lockingScript: [0x01, 0x02, 0x03, 0x04],
            providedBy: 'you',
            purpose: 'updated_purpose',
            satoshis: 3000,
            scriptLength: 150,
            scriptOffset: 5,
            senderIdentityKey: 'updated_sender_key',
            sequenceNumber: 10,
            spendingDescription: 'Updated spending description',
            spendable: false,
            spentBy: 3,
            txid: 'updated_txid',
            type: 'updated_type',
            outputDescription: 'outputDescription'
          }
          const updateResult = await storage.updateOutput(record.outputId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findOutputs({ partial: { outputId: record.outputId } })
          const updatedRow = verifyOne(updatedRecords, `Updated Output with outputId=${record.outputId} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            if (Buffer.isBuffer(actualValue) || Array.isArray(actualValue)) {
              expect(JSON.stringify({ type: 'Buffer', data: actualValue })).toStrictEqual(JSON.stringify(value))
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying Output record with outputId=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('22_update OutputTag', async () => {
    const primaryKey = 'outputTagId'
    for (const { storage } of setups) {
      const records = await storage.findOutputTags({ partial: {} })
      for (const record of records) {
        if (!record.userId) record.userId = 1
        if (!record.tag) record.tag = `default_tag_${record.outputTagId}`
        if (!record.userId || !record.tag) {
          throw new Error(`Missing required fields for record ${JSON.stringify(record)}`)
        }
      }
      for (const record of records) {
        const uniqueTag = `updated_tag_${record.outputTagId}`
        const testValues: OutputTag = {
          outputTagId: record.outputTagId,
          userId: record.userId,
          tag: uniqueTag,
          created_at: new Date('2024-12-30T23:00:00Z'),
          updated_at: new Date('2024-12-30T23:05:00Z'),
          isDeleted: false
        }
        try {
          const updateResult = await storage.updateOutputTag(record.outputTagId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findOutputTags({ partial: { outputTagId: record.outputTagId } })
          const updatedRow = verifyOne(updatedRecords, `Updated OutputTag with outputTagId=${record.outputTagId} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            if (typeof actualValue === 'boolean') {
              if (value === 1) {
                expect(actualValue).toBe(true)
              } else if (value === 0) {
                expect(actualValue).toBe(false)
              } else {
                throw new Error(`Unexpected value for expectedValue: ${value}. Must be 0 or 1.`)
              }
              continue
            }
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying OutputTag record with outputTagId=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('23_update OutputTagMap', async () => {
    const primaryKey = ['outputTagId', 'outputId']
    for (const { storage } of setups) {
      const records = await storage.findOutputTagMaps({ partial: {} })
      for (const record of records) {
        if (!record.outputTagId) throw new Error(`Missing outputTagId for record: ${JSON.stringify(record)}`)
        if (!record.outputId) throw new Error(`Missing outputId for record: ${JSON.stringify(record)}`)
        try {
          const testValues: OutputTagMap = {
            outputTagId: record.outputTagId,
            outputId: record.outputId,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            isDeleted: false
          }
          const updateResult = await storage.updateOutputTagMap(record.outputId, record.outputTagId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findOutputTagMaps({ partial: { outputTagId: record.outputTagId, outputId: record.outputId } })
          const updatedRow = verifyOne(updatedRecords, `Updated OutputTagMap with outputTagId=${record.outputTagId} and outputId=${record.outputId} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            if (typeof actualValue === 'boolean') {
              if (value === 1) {
                expect(actualValue).toBe(true)
              } else if (value === 0) {
                expect(actualValue).toBe(false)
              } else {
                throw new Error(`Unexpected value for expectedValue: ${value}. Must be 0 or 1.`)
              }
              continue
            }
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying OutputTagMap record with outputTagId=${record.outputTagId} and outputId=${record.outputId}:`, error.message)
          throw error
        }
      }
    }
  })

  test('24_update TxLabel', async () => {
    const primaryKey = 'txLabelId'
    for (const { storage } of setups) {
      const records = await storage.findTxLabels({ partial: {} })
      for (const record of records) {
        if (!record.userId) {
          throw new Error(`Missing required foreign key userId for record ${JSON.stringify(record)}`)
        }
      }
      for (const record of records) {
        const uniqueLabel = `unique_label_${record.txLabelId}`
        const testValues: TxLabel = {
          txLabelId: record.txLabelId,
          userId: record.userId,
          label: uniqueLabel,
          isDeleted: false,
          created_at: new Date('2024-12-30T23:00:00Z'),
          updated_at: new Date('2024-12-30T23:05:00Z')
        }
        const existingLabel = await storage.findTxLabels({ partial: { label: testValues.label, userId: testValues.userId } })
        if (existingLabel.length > 0) {
          continue
        }
        const updateResult = await storage.updateTxLabel(record.txLabelId, testValues)
        expect(updateResult).toBe(1)
        const updatedRecords = await storage.findTxLabels({ partial: { txLabelId: record.txLabelId } })
        const updatedRow = verifyOne(updatedRecords, `Updated TxLabel with txLabelId=${record.txLabelId} was not unique or missing.`)
        for (const [key, value] of Object.entries(testValues)) {
          const actualValue = updatedRow[key]
          if (typeof actualValue === 'boolean') {
            if (value === 1) {
              expect(actualValue).toBe(true)
            } else if (value === 0) {
              expect(actualValue).toBe(false)
            } else {
              throw new Error(`Unexpected value for expectedValue: ${value}. Must be 0 or 1.`)
            }
            continue
          }
          const normalizedActual = normalizeDate(actualValue)
          const normalizedExpected = normalizeDate(value)
          if (normalizedActual && normalizedExpected) {
            expect(normalizedActual).toBe(normalizedExpected)
            continue
          }
          expect(actualValue).toBe(value)
        }
      }
    }
  })

  test('25_update TxLabelMap', async () => {
    const primaryKeyTransaction = 'transactionId'
    const primaryKeyLabel = 'txLabelId'
    for (const { storage, setup } of setups) {
      const records = await storage.findTxLabelMaps({ partial: {} })
      for (const record of records) {
        if (!record.transactionId || !record.txLabelId) {
          throw new Error(`Missing required foreign keys for record ${JSON.stringify(record)}`)
        }
      }
      for (const record of records) {
        const testValues: TxLabelMap = {
          transactionId: record.transactionId,
          txLabelId: record.txLabelId,
          created_at: new Date('2024-12-30T23:00:00Z'),
          updated_at: new Date('2024-12-30T23:05:00Z'),
          isDeleted: false
        }
        const existingRecord = await storage.findTxLabelMaps({
          partial: { transactionId: testValues.transactionId, txLabelId: testValues.txLabelId }
        })
        if (existingRecord.length > 0) {
          continue
        }
        try {
          const updateResult = await storage.updateTxLabelMap(record.transactionId, record.txLabelId, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findTxLabelMaps({
            partial: { transactionId: record.transactionId, txLabelId: record.txLabelId }
          })
          const updatedRow = verifyOne(updatedRecords, `Updated TxLabelMap with transactionId=${record[primaryKeyTransaction]} and txLabelId=${record[primaryKeyLabel]} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying TxLabelMap record with transactionId=${record[primaryKeyTransaction]} and txLabelId=${record[primaryKeyLabel]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('26_update MonitorEvent', async () => {
    const primaryKey = 'id'
    for (const { storage, setup } of setups) {
      const records = await storage.findMonitorEvents({ partial: {} })
      for (const record of records) {
        try {
          const testValues: MonitorEvent = {
            id: record.id,
            created_at: new Date('2024-12-30T23:00:00Z'),
            updated_at: new Date('2024-12-30T23:05:00Z'),
            event: 'updated_event',
            details: 'Updated details'
          }
          const updateResult = await storage.updateMonitorEvent(record.id, testValues)
          expect(updateResult).toBe(1)
          const updatedRecords = await storage.findMonitorEvents({ partial: { id: record.id } })
          const updatedRow = verifyOne(updatedRecords, `Updated MonitorEvent with id=${record.id} was not unique or missing.`)
          for (const [key, value] of Object.entries(testValues)) {
            const actualValue = updatedRow[key]
            const normalizedActual = normalizeDate(actualValue)
            const normalizedExpected = normalizeDate(value)
            if (normalizedActual && normalizedExpected) {
              expect(normalizedActual).toBe(normalizedExpected)
              continue
            }
            expect(actualValue).toBe(value)
          }
        } catch (error: any) {
          console.error(`Error updating or verifying MonitorEvent record with id=${record[primaryKey]}:`, error.message)
          throw error
        }
      }
    }
  })

  test('27_update SyncState', async () => {
    const primaryKey = 'syncStateId'
    for (const { storage } of setups) {
      const records = await storage.findSyncStates({ partial: {} })
      for (const record of records) {
        if (!record.userId) {
          throw new Error(`Missing required foreign key userId for record ${JSON.stringify(record)}`)
        }
      }
      for (const record of records) {
        const testValues: SyncState = {
          syncStateId: record.syncStateId,
          userId: record.userId,
          refNum: 'test_refNum',
          created_at: new Date('2025-01-01T00:00:00.000Z'),
          updated_at: new Date('2025-01-01T00:00:00.000Z'),
          errorLocal: 'Example local error',
          errorOther: 'Example other error',
          init: false,
          satoshis: 1000,
          status: 'success',
          storageIdentityKey: 'test_identity_key',
          storageName: 'test_storage',
          syncMap: '{}',
          when: new Date('2025-01-01T02:00:00.000Z')
        }
        const updateResult = await storage.updateSyncState(record.syncStateId, testValues)
        expect(updateResult).toBe(1)
        const updatedRecords = await storage.findSyncStates({ partial: { syncStateId: record.syncStateId } })
        const updatedRow = verifyOne(updatedRecords, `Updated SyncState with syncStateId=${record.syncStateId} was not unique or missing.`)
        for (const [key, value] of Object.entries(testValues)) {
          const actualValue = updatedRow[key]
          if (typeof actualValue === 'boolean') {
            if (value === 1) {
              expect(actualValue).toBe(true)
            } else if (value === 0) {
              expect(actualValue).toBe(false)
            } else {
              throw new Error(`Unexpected value for expectedValue: ${value}. Must be 0 or 1.`)
            }
            continue
          }
          if (actualValue instanceof Date) {
            const actualDate = new Date(actualValue)
            const expectedDate = new Date(value)
            expect(actualDate.getTime()).toBe(expectedDate.getTime())
            continue
          }
          if (value === undefined || value === null) {
            expect(actualValue).toBeNull()
            continue
          }
          if (key === 'refNum') {
            expect(actualValue).toBe('test_refNum')
            continue
          }
          expect(actualValue).toStrictEqual(value)
        }
      }
    }
  })
})
