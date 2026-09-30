import { onRequest } from 'firebase-functions/https'
import { processScheduledBroadcasts } from './scheduler'

export const healthcheck = onRequest((_request, response) => {
  response.status(200).json({ status: 'ok' })
})

export { processScheduledBroadcasts }
