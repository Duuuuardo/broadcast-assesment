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
  type Unsubscribe,
} from 'firebase/firestore'

import { db } from '@/lib/firebase'
import type { Contact } from '@/types'
import { phoneValidationMessage } from '@/utils/phone'

import {
  COLLECTIONS,
  entityConverter,
  getCurrentUserId,
  requiredText,
  type StoredDocument,
} from './firestore'

export type CreateContactInput = {
  connectionId: string
  name: string
  phone: string
}

export type UpdateContactInput = {
  name: string
  phone: string
}

const contactsCollection = collection(db, COLLECTIONS.contacts).withConverter(
  entityConverter<Contact>(),
)

const contactsQuery = (connectionId?: string): Query<StoredDocument<Contact>> => {
  const filters: QueryConstraint[] = [where('ownerId', '==', getCurrentUserId())]

  if (connectionId !== undefined) {
    filters.push(where('connectionId', '==', connectionId))
  }

  return query(contactsCollection, ...filters, orderBy('createdAt', 'desc'))
}

const readContacts = (snapshot: QuerySnapshot<StoredDocument<Contact>>): Contact[] =>
  snapshot.docs.map((document) => ({ ...document.data(), id: document.id }))

const requiredPhone = (value: string): string => {
  const message = phoneValidationMessage(value)

  if (message !== null) {
    throw new Error(message)
  }

  return value.trim()
}

export const getContacts = async (connectionId?: string): Promise<Contact[]> => {
  const snapshot = await getDocs(contactsQuery(connectionId))

  return readContacts(snapshot)
}

export const createContact = async ({
  connectionId,
  name,
  phone,
}: CreateContactInput): Promise<string> => {
  const reference = doc(contactsCollection)

  await setDoc(reference, {
    ownerId: getCurrentUserId(),
    connectionId: requiredText(connectionId, 'connectionId'),
    name: requiredText(name, 'name'),
    phone: requiredPhone(phone),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return reference.id
}

export const updateContact = async (id: string, { name, phone }: UpdateContactInput): Promise<void> => {
  await updateDoc(doc(contactsCollection, id), {
    name: requiredText(name, 'name'),
    phone: requiredPhone(phone),
    updatedAt: serverTimestamp(),
  })
}

export const deleteContact = async (id: string): Promise<void> => {
  await deleteDoc(doc(contactsCollection, id))
}

export const subscribeToContacts = (
  connectionId: string | undefined,
  onContacts: (contacts: Contact[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    contactsQuery(connectionId),
    (snapshot) => onContacts(readContacts(snapshot)),
    (error) => onError?.(error),
  )