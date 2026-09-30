import assert from 'node:assert/strict'
import { after, before, beforeEach, describe, it } from 'node:test'
import { deleteApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { processScheduledMessages } from '../functions/lib/lib/broadcastScheduler.js'

let app
let db

before(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
  app = getApps().length > 0 ? getApps()[0] : initializeApp({ projectId: 'demo-broadcast' }, 'test-app')
  db = getFirestore(app)
})

after(async () => {
  if (app) {
    await deleteApp(app)
  }
})

const clearMessages = async () => {
  const snapshot = await db.collection('messages').get()
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
}

describe('processScheduledMessages', () => {
  beforeEach(async () => {
    await clearMessages()
  })

  it('processa mensagem agendada vencida: vira sent, preenche sentAt e preserva demais campos', async () => {
    const pastTime = Timestamp.fromDate(new Date(Date.now() - 3600 * 1000))
    const docRef = db.collection('messages').doc('msg-overdue')

    const originalData = {
      ownerId: 'user-tenant-1',
      connectionId: 'conn-1',
      contactIds: ['contact-1', 'contact-2'],
      content: 'Mensagem agendada vencida',
      status: 'scheduled',
      scheduledAt: pastTime,
      sentAt: null,
      createdAt: pastTime,
      updatedAt: pastTime,
    }

    await docRef.set(originalData)

    const now = Timestamp.now()
    const result = await processScheduledMessages(db, now)

    assert.equal(result.processedCount, 1)
    assert.equal(result.errorCount, 0)

    const updatedSnap = await docRef.get()
    const updatedData = updatedSnap.data()

    assert.equal(updatedData.status, 'sent')
    assert.notEqual(updatedData.sentAt, null)
    assert.ok(updatedData.sentAt instanceof Timestamp || typeof updatedData.sentAt.toDate === 'function')
    assert.equal(updatedData.scheduledAt.toMillis(), pastTime.toMillis())
    assert.equal(updatedData.ownerId, originalData.ownerId)
    assert.equal(updatedData.connectionId, originalData.connectionId)
    assert.deepEqual(updatedData.contactIds, originalData.contactIds)
    assert.equal(updatedData.content, originalData.content)
  })

  it('mensagem com horário futuro permanece scheduled', async () => {
    const futureTime = Timestamp.fromDate(new Date(Date.now() + 3600 * 1000))
    const docRef = db.collection('messages').doc('msg-future')

    await docRef.set({
      ownerId: 'user-tenant-1',
      connectionId: 'conn-1',
      contactIds: ['contact-1'],
      content: 'Mensagem no futuro',
      status: 'scheduled',
      scheduledAt: futureTime,
      sentAt: null,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    const now = Timestamp.now()
    const result = await processScheduledMessages(db, now)

    assert.equal(result.processedCount, 0)

    const snap = await docRef.get()
    assert.equal(snap.data().status, 'scheduled')
    assert.equal(snap.data().sentAt, null)
  })

  it('mensagem já sent não é processada novamente (idempotência)', async () => {
    const pastTime = Timestamp.fromDate(new Date(Date.now() - 3600 * 1000))
    const sentTime = Timestamp.fromDate(new Date(Date.now() - 1800 * 1000))
    const docRef = db.collection('messages').doc('msg-sent')

    await docRef.set({
      ownerId: 'user-tenant-1',
      connectionId: 'conn-1',
      contactIds: ['contact-1'],
      content: 'Mensagem já enviada',
      status: 'sent',
      scheduledAt: pastTime,
      sentAt: sentTime,
      createdAt: pastTime,
      updatedAt: sentTime,
    })

    const now = Timestamp.now()
    const result = await processScheduledMessages(db, now)

    assert.equal(result.processedCount, 0)
    assert.equal(result.skippedCount, 0)

    const snap = await docRef.get()
    assert.equal(snap.data().status, 'sent')
    assert.equal(snap.data().sentAt.toMillis(), sentTime.toMillis())
  })

  it('re-execução em mensagem recém-processada não altera status nem sentAt', async () => {
    const pastTime = Timestamp.fromDate(new Date(Date.now() - 3600 * 1000))
    const docRef = db.collection('messages').doc('msg-double-run')

    await docRef.set({
      ownerId: 'user-tenant-1',
      connectionId: 'conn-1',
      contactIds: ['contact-1'],
      content: 'Mensagem teste idempotência',
      status: 'scheduled',
      scheduledAt: pastTime,
      sentAt: null,
      createdAt: pastTime,
      updatedAt: pastTime,
    })

    const now = Timestamp.now()
    const run1 = await processScheduledMessages(db, now)
    assert.equal(run1.processedCount, 1)

    const snapAfterRun1 = await docRef.get()
    const sentAtRun1 = snapAfterRun1.data().sentAt

    const run2 = await processScheduledMessages(db, now)
    assert.equal(run2.processedCount, 0)

    const snapAfterRun2 = await docRef.get()
    assert.equal(snapAfterRun2.data().status, 'sent')
    assert.equal(snapAfterRun2.data().sentAt.toMillis(), sentAtRun1.toMillis())
  })

  it('processa múltiplos tenants sem alterar ownerId ou misturar dados', async () => {
    const pastTime = Timestamp.fromDate(new Date(Date.now() - 3600 * 1000))
    const now = Timestamp.now()

    await db.collection('messages').doc('msg-tenant-a').set({
      ownerId: 'tenant-a',
      connectionId: 'conn-a',
      contactIds: ['c-a'],
      content: 'Conteúdo A',
      status: 'scheduled',
      scheduledAt: pastTime,
      sentAt: null,
      createdAt: pastTime,
      updatedAt: pastTime,
    })

    await db.collection('messages').doc('msg-tenant-b').set({
      ownerId: 'tenant-b',
      connectionId: 'conn-b',
      contactIds: ['c-b'],
      content: 'Conteúdo B',
      status: 'scheduled',
      scheduledAt: pastTime,
      sentAt: null,
      createdAt: pastTime,
      updatedAt: pastTime,
    })

    const result = await processScheduledMessages(db, now)
    assert.equal(result.processedCount, 2)

    const docA = (await db.collection('messages').doc('msg-tenant-a').get()).data()
    const docB = (await db.collection('messages').doc('msg-tenant-b').get()).data()

    assert.equal(docA.status, 'sent')
    assert.equal(docA.ownerId, 'tenant-a')
    assert.equal(docB.status, 'sent')
    assert.equal(docB.ownerId, 'tenant-b')
  })

  it('processa em lotes (batching) com limite de documentos por página', async () => {
    const pastTime = Timestamp.fromDate(new Date(Date.now() - 3600 * 1000))
    const now = Timestamp.now()

    for (let i = 1; i <= 5; i++) {
      await db.collection('messages').doc(`msg-batch-${i}`).set({
        ownerId: 'tenant-batch',
        connectionId: 'conn-1',
        contactIds: ['c-1'],
        content: `Batch content ${i}`,
        status: 'scheduled',
        scheduledAt: pastTime,
        sentAt: null,
        createdAt: pastTime,
        updatedAt: pastTime,
      })
    }

    const result = await processScheduledMessages(db, now, 2)
    assert.equal(result.processedCount, 5)
    assert.equal(result.errorCount, 0)

    const pendingSnap = await db
      .collection('messages')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .get()

    assert.equal(pendingSnap.empty, true)
  })
})
