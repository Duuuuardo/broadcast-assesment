import { Firestore, Timestamp } from 'firebase-admin/firestore'

export type ProcessResult = {
  processedCount: number
  skippedCount: number
  errorCount: number
  errors: Array<{ id: string; error: string }>
}

export const processScheduledMessages = async (
  db: Firestore,
  now: Timestamp = Timestamp.now(),
  batchLimit = 100,
): Promise<ProcessResult> => {
  const result: ProcessResult = {
    processedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
  }

  const attemptedDocIds = new Set<string>()
  let hasMore = true

  while (hasMore) {
    const snapshot = await db
      .collection('messages')
      .where('status', '==', 'scheduled')
      .where('scheduledAt', '<=', now)
      .limit(batchLimit)
      .get()

    if (snapshot.empty) {
      break
    }

    const unattemptedDocs = snapshot.docs.filter((doc) => !attemptedDocIds.has(doc.id))

    if (unattemptedDocs.length === 0) {
      break
    }

    for (const docSnap of unattemptedDocs) {
      attemptedDocIds.add(docSnap.id)

      try {
        const processed = await db.runTransaction(async (transaction) => {
          const freshSnap = await transaction.get(docSnap.ref)

          if (!freshSnap.exists) {
            return false
          }

          const data = freshSnap.data()

          if (data?.status !== 'scheduled') {
            return false
          }

          transaction.update(docSnap.ref, {
            status: 'sent',
            sentAt: now,
            updatedAt: now,
          })

          return true
        })

        if (processed) {
          result.processedCount++
          console.log(
            `[processScheduledMessages] Broadcast ${docSnap.id} (owner: ${docSnap.data()?.ownerId}) processado com sucesso.`,
          )
        } else {
          result.skippedCount++
          console.log(
            `[processScheduledMessages] Broadcast ${docSnap.id} ignorado (status != scheduled).`,
          )
        }
      } catch (err: unknown) {
        result.errorCount++
        const errorMessage = err instanceof Error ? err.message : String(err)
        result.errors.push({ id: docSnap.id, error: errorMessage })
        console.error(`[processScheduledMessages] Erro ao processar mensagem ${docSnap.id}:`, err)
      }
    }

    if (snapshot.docs.length < batchLimit) {
      hasMore = false
    }
  }

  return result
}
