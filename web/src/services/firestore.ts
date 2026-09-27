import type { FirestoreDataConverter, WithFieldValue } from 'firebase/firestore'

import { auth } from '@/lib/firebase'

export const COLLECTIONS = {
  connections: 'connections',
  contacts: 'contacts',
  messages: 'messages',
} as const

export const getCurrentUserId = (): string => {
  const userId = auth.currentUser?.uid

  if (userId === undefined) {
    throw new Error(
      'Nenhum usuário autenticado: operações de dados exigem um usuário do Firebase Authentication.',
    )
  }

  return userId
}

export const requiredText = (value: string, field: string): string => {
  const text = value.trim()

  if (text === '') {
    throw new Error(`O campo "${field}" é obrigatório.`)
  }

  return text
}

export type StoredDocument<T extends { id: string }> = Omit<T, 'id'>

export const entityConverter = <T extends { id: string }>(): FirestoreDataConverter<
  StoredDocument<T>,
  StoredDocument<T>
> => ({
  toFirestore: (document) => document as WithFieldValue<StoredDocument<T>>,
  fromFirestore: (snapshot) => snapshot.data() as StoredDocument<T>,
})