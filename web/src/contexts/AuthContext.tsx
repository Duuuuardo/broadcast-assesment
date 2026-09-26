import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Unsubscribe,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { auth } from '@/lib/firebase'

export type AuthState = {
  user: User | null
  loading: boolean
}

export type SignUpCredentials = {
  name: string
  email: string
  password: string
}

export type SignInCredentials = {
  email: string
  password: string
}

export type AuthContextValue = AuthState & {
  ownerId: string | null
  signIn: (credentials: SignInCredentials) => Promise<UserCredential>
  signUp: (credentials: SignUpCredentials) => Promise<UserCredential>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

type AuthProviderProps = {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(() => {
    const unsubscribe: Unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false })
    })

    return unsubscribe
  }, [])

  const signIn = async ({ email, password }: SignInCredentials): Promise<UserCredential> =>
    signInWithEmailAndPassword(auth, email, password)

  const signUp = async ({ name, email, password }: SignUpCredentials): Promise<UserCredential> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password)

    await updateProfile(credential.user, { displayName: name })

    setState((current) => ({ ...current, user: credential.user }))

    return credential
  }

  const logout = async (): Promise<void> => {
    await signOut(auth)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      ownerId: state.user?.uid ?? null,
      signIn,
      signUp,
      logout,
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
