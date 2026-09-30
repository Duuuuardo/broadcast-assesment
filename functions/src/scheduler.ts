import { onSchedule } from 'firebase-functions/v2/scheduler'
import { processScheduledMessages } from './lib/broadcastScheduler'
import { db } from './lib/firebaseAdmin'

export const processScheduledBroadcasts = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'UTC',
    retryCount: 0,
  },
  async () => {
    console.log('[processScheduledBroadcasts] Iniciando verificação de broadcasts agendados...')
    try {
      const result = await processScheduledMessages(db)
      console.log(
        `[processScheduledBroadcasts] Processamento concluído. Processadas: ${result.processedCount}, Ignoradas: ${result.skippedCount}, Erros: ${result.errorCount}`,
      )
    } catch (error) {
      console.error('[processScheduledBroadcasts] Erro inesperado no job agendado:', error)
    }
  },
)
