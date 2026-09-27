import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, describe, it } from 'node:test'

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  Timestamp,
} from 'firebase/firestore'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'

const OWNER = 'owner-alice'
const OTHER = 'owner-bob'

let testEnv

const now = () => Timestamp.fromDate(new Date())

const seed = async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()

    await setDoc(doc(db, 'connections', 'conn-alice'), {
      ownerId: OWNER,
      name: 'Conexão da Alice',
      createdAt: now(),
      updatedAt: now(),
    })

    await setDoc(doc(db, 'connections', 'conn-bob'), {
      ownerId: OTHER,
      name: 'Conexão do Bob',
      createdAt: now(),
      updatedAt: now(),
    })

    await setDoc(doc(db, 'contacts', 'contact-bob'), {
      ownerId: OTHER,
      connectionId: 'conn-bob',
      name: 'Contato do Bob',
      phone: '+5511999999999',
      createdAt: now(),
      updatedAt: now(),
    })
  })
}

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT ?? 'demo-broadcast',
    firestore: {
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8'),
    },
  })

  await seed()
})

after(async () => {
  await testEnv.cleanup()
})

const asUser = (uid) => testEnv.authenticatedContext(uid).firestore()

const newConnection = (data) => ({ ownerId: OWNER, name: 'Nova conexão', ...data })

describe('isolamento por tenant', () => {
  it('nega qualquer acesso sem autenticação', async () => {
    const anonymous = testEnv.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(anonymous, 'connections', 'conn-alice')))
    await assertFails(getDocs(collection(anonymous, 'connections')))
    await assertFails(
      setDoc(doc(anonymous, 'connections', 'anon'), newConnection()),
    )
  })

  it('lê apenas os documentos do próprio usuário', async () => {
    const db = asUser(OWNER)

    await assertSucceeds(getDoc(doc(db, 'connections', 'conn-alice')))
    await assertFails(getDoc(doc(db, 'connections', 'conn-bob')))
  })

  it('lê apenas os documentos do próprio usuário em consultas', async () => {
    const db = asUser(OWNER)

    const proprios = await getDocs(
      query(collection(db, 'connections'), where('ownerId', '==', OWNER)),
    )

    assert.deepEqual(
      proprios.docs.map((item) => item.id),
      ['conn-alice'],
    )
  })

  it('recusa consulta que tenta alcançar outro tenant', async () => {
    const db = asUser(OWNER)

    await assertFails(
      getDocs(query(collection(db, 'connections'), where('ownerId', '==', OTHER))),
    )
    await assertFails(getDocs(collection(db, 'connections')))
    await assertFails(getDocs(collection(db, 'contacts')))
  })

  it('cria apenas com o próprio ownerId', async () => {
    const db = asUser(OWNER)

    await assertSucceeds(
      setDoc(doc(db, 'connections', 'conn-nova'), newConnection()),
    )
    await assertFails(
      setDoc(doc(db, 'connections', 'conn-falsa'), newConnection({ ownerId: OTHER })),
    )
    await assertFails(
      setDoc(doc(db, 'connections', 'conn-sem-owner'), { name: 'Sem dono' }),
    )
  })

  it('impede trocar o ownerId de um documento existente', async () => {
    const db = asUser(OWNER)

    await assertFails(
      updateDoc(doc(db, 'connections', 'conn-alice'), { ownerId: OTHER }),
    )
    await assertSucceeds(
      updateDoc(doc(db, 'connections', 'conn-alice'), { name: 'Renomeada' }),
    )
  })

  it('impede editar ou apagar documento de outro tenant', async () => {
    const db = asUser(OWNER)

    await assertFails(
      updateDoc(doc(db, 'connections', 'conn-bob'), { name: 'Invadida' }),
    )
    await assertFails(deleteDoc(doc(db, 'connections', 'conn-bob')))
    await assertSucceeds(deleteDoc(doc(db, 'connections', 'conn-nova')))
  })

  it('nega collections fora do domínio', async () => {
    const db = asUser(OWNER)

    await assertFails(setDoc(doc(db, 'users', OWNER), { email: 'a@b.c' }))
    await assertFails(getDocs(collection(db, 'qualquer')))
  })
})

describe('integridade entre entidades', () => {
  it('aceita contato e mensagem ligados a uma conexão do próprio tenant', async () => {
    const db = asUser(OWNER)

    await assertSucceeds(
      setDoc(doc(db, 'contacts', 'contact-alice'), {
        ownerId: OWNER,
        connectionId: 'conn-alice',
        name: 'Contato da Alice',
        phone: '+5511888888888',
        createdAt: now(),
        updatedAt: now(),
      }),
    )

    await assertSucceeds(
      setDoc(doc(db, 'messages', 'message-alice'), {
        ownerId: OWNER,
        connectionId: 'conn-alice',
        contactIds: ['contact-alice'],
        content: 'Olá',
        status: 'scheduled',
        scheduledAt: now(),
        sentAt: null,
        createdAt: now(),
        updatedAt: now(),
      }),
    )
  })

  it('recusa referência a conexão de outro tenant ou inexistente', async () => {
    const db = asUser(OWNER)

    await assertFails(
      setDoc(doc(db, 'contacts', 'contact-roubado'), {
        ownerId: OWNER,
        connectionId: 'conn-bob',
        name: 'Contato roubado',
        phone: '+5511777777777',
        createdAt: now(),
        updatedAt: now(),
      }),
    )

    await assertFails(
      setDoc(doc(db, 'messages', 'message-roubada'), {
        ownerId: OWNER,
        connectionId: 'conn-inexistente',
        contactIds: ['contact-alice'],
        content: 'Olá',
        status: 'scheduled',
        scheduledAt: now(),
        sentAt: null,
        createdAt: now(),
        updatedAt: now(),
      }),
    )

    await assertFails(
      updateDoc(doc(db, 'contacts', 'contact-alice'), { connectionId: 'conn-bob' }),
    )
  })

  it('impede apagar dados de outro tenant', async () => {
    const db = asUser(OWNER)

    await assertFails(deleteDoc(doc(db, 'contacts', 'contact-bob')))
  })
})