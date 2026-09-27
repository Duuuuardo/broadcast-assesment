import type { Timestamp } from 'firebase/firestore'

export const MESSAGE_STATUSES = ['scheduled', 'sent'] as const

export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export type Message = {
  id: string
  ownerId: string
  connectionId: string
  contactIds: string[]
  content: string
  status: MessageStatus
  scheduledAt: Timestamp | null
  sentAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
