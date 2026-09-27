import type { Timestamp } from 'firebase/firestore'

export type Connection = {
  id: string
  ownerId: string
  name: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
