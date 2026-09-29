import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Query,
  type QueryConstraint,
  type QuerySnapshot,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Message, MessageStatus } from '@/types'

import {
  COLLECTIONS,
  entityConverter,
  getCurrentUserId,
  requiredText,
  type StoredDocument,
} from './firestore'

export type MessageFilters = {
  connectionId?: string
  status?: MessageStatus
  orderBy?: 'createdAt' | 'scheduledAt'
}

export type CreateMessageInput = {
  connectionId: string
  contactIds: string[]
  content: string
  scheduledAt?: Date | Timestamp | null
}

export type UpdateMessageInput = {
  content: string
  contactIds: string[]
  scheduledAt: Date | Timestamp
}

const messagesCollection = collection(db, COLLECTIONS.messages).withConverter(
  entityConverter<Message>(),
)

const messagesQuery = (filters: MessageFilters = {}): Query<StoredDocument<Message>> => {
  const { connectionId, status, orderBy: orderField = 'createdAt' } = filters
  const constraints: QueryConstraint[] = [where('ownerId', '==', getCurrentUserId())]

  if (connectionId !== undefined) {
    constraints.push(where('connectionId', '==', connectionId))
  }

  if (status !== undefined) {
    constraints.push(where('status', '==', status))
  }

  const direction = orderField === 'scheduledAt' ? 'asc' : 'desc'

  return query(messagesCollection, ...constraints, orderBy(orderField, direction))
}

const readMessages = (snapshot: QuerySnapshot<StoredDocument<Message>>): Message[] =>
  snapshot.docs.map((document) => ({ ...document.data(), id: document.id }))

export const getMessages = async (filters: MessageFilters = {}): Promise<Message[]> => {
  const snapshot = await getDocs(messagesQuery(filters))

  return readMessages(snapshot)
}

const toTimestamp = (value: Date | Timestamp | null | undefined): Timestamp | null => {
  if (value === null || value === undefined) {
    return null
  }
  if (value instanceof Date) {
    return Timestamp.fromDate(value)
  }
  return value
}

export const createMessage = async ({
  connectionId,
  contactIds,
  content,
  scheduledAt,
}: CreateMessageInput): Promise<string> => {
  if (contactIds.length === 0) {
    throw new Error('O campo "contactIds" precisa de ao menos um contato.')
  }

  const scheduledTimestamp = toTimestamp(scheduledAt)
  const reference = doc(messagesCollection)

  if (scheduledTimestamp) {
    const now = new Date()
    if (scheduledTimestamp.toDate().getTime() <= now.getTime()) {
      throw new Error('Escolha uma data e horário futuros.')
    }
  }

  await setDoc(reference, {
    ownerId: getCurrentUserId(),
    connectionId: requiredText(connectionId, 'connectionId'),
    contactIds: [...contactIds],
    content: requiredText(content, 'content'),
    status: scheduledTimestamp ? 'scheduled' : 'sent',
    scheduledAt: scheduledTimestamp,
    sentAt: scheduledTimestamp ? null : serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return reference.id
}

export const updateMessage = async (
  id: string,
  { content, contactIds, scheduledAt }: UpdateMessageInput,
): Promise<void> => {
  if (contactIds.length === 0) {
    throw new Error('O campo "contactIds" precisa de ao menos um contato.')
  }

  const scheduledTimestamp = toTimestamp(scheduledAt)
  if (!scheduledTimestamp) {
    throw new Error('Data de agendamento é obrigatória.')
  }

  const now = new Date()
  if (scheduledTimestamp.toDate().getTime() <= now.getTime()) {
    throw new Error('Escolha uma data e horário futuros.')
  }

  await updateDoc(doc(messagesCollection, id), {
    content: requiredText(content, 'content'),
    contactIds: [...contactIds],
    scheduledAt: scheduledTimestamp,
    updatedAt: serverTimestamp(),
  })
}

export const deleteMessage = async (id: string): Promise<void> => {
  await deleteDoc(doc(messagesCollection, id))
}

export const subscribeToMessages = (
  filters: MessageFilters,
  onMessages: (messages: Message[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    messagesQuery(filters),
    (snapshot) => onMessages(readMessages(snapshot)),
    (error) => onError?.(error),
  )