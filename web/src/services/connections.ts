import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Query,
  type QuerySnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Connection } from '@/types'
import { isErrorCode } from '@/utils/data-errors'

import {
  COLLECTIONS,
  entityConverter,
  getCurrentUserId,
  requiredText,
  type StoredDocument,
} from './firestore'

export type CreateConnectionInput = {
  name: string
}

export type UpdateConnectionInput = CreateConnectionInput

const connectionsCollection = collection(db, COLLECTIONS.connections).withConverter(
  entityConverter<Connection>(),
)

const connectionsQuery = (): Query<StoredDocument<Connection>> =>
  query(
    connectionsCollection,
    where('ownerId', '==', getCurrentUserId()),
    orderBy('createdAt', 'desc'),
  )

const readConnections = (snapshot: QuerySnapshot<StoredDocument<Connection>>): Connection[] =>
  snapshot.docs.map((document) => ({ ...document.data(), id: document.id }))

export const getConnections = async (): Promise<Connection[]> => {
  const snapshot = await getDocs(connectionsQuery())

  return readConnections(snapshot)
}

export const getConnection = async (id: string): Promise<Connection | null> => {
  try {
    const snapshot = await getDocs(
      query(
        connectionsCollection,
        where('ownerId', '==', getCurrentUserId()),
        where(documentId(), '==', id),
      ),
    )

    const [document] = snapshot.docs

    return document === undefined ? null : { ...document.data(), id: document.id }
  } catch (error) {
    if (isErrorCode(error, 'permission-denied', 'not-found')) {
      return null
    }

    throw error
  }
}

export const createConnection = async ({ name }: CreateConnectionInput): Promise<string> => {
  const reference = doc(connectionsCollection)

  await setDoc(reference, {
    ownerId: getCurrentUserId(),
    name: requiredText(name, 'name'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return reference.id
}

export const updateConnection = async (id: string, { name }: UpdateConnectionInput): Promise<void> => {
  await updateDoc(doc(connectionsCollection, id), {
    name: requiredText(name, 'name'),
    updatedAt: serverTimestamp(),
  })
}

const FIRESTORE_BATCH_LIMIT = 500

const deleteLinkedDocuments = async (
  collectionName: string,
  connectionId: string,
): Promise<void> => {
  const snapshot = await getDocs(
    query(
      collection(db, collectionName),
      where('ownerId', '==', getCurrentUserId()),
      where('connectionId', '==', connectionId),
    ),
  )

  for (let offset = 0; offset < snapshot.docs.length; offset += FIRESTORE_BATCH_LIMIT) {
    const batch = writeBatch(db)

    snapshot.docs
      .slice(offset, offset + FIRESTORE_BATCH_LIMIT)
      .forEach((document) => batch.delete(document.ref))

    await batch.commit()
  }
}

export const deleteConnection = async (id: string): Promise<void> => {
  await deleteLinkedDocuments(COLLECTIONS.contacts, id)
  await deleteLinkedDocuments(COLLECTIONS.messages, id)
  await deleteDoc(doc(connectionsCollection, id))
}

export const subscribeToConnections = (
  onConnections: (connections: Connection[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    connectionsQuery(),
    (snapshot) => onConnections(readConnections(snapshot)),
    (error) => onError?.(error),
  )