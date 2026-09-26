const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Email ou senha inválidos.',
  'auth/invalid-login-credentials': 'Email ou senha inválidos.',
  'auth/user-not-found': 'Não encontramos uma conta com este email.',
  'auth/wrong-password': 'Email ou senha inválidos.',
  'auth/invalid-email': 'Informe um email válido.',
  'auth/missing-email': 'Informe o email.',
  'auth/missing-password': 'Informe a senha.',
  'auth/email-already-in-use': 'Este email já está cadastrado.',
  'auth/weak-password': 'A senha informada é muito fraca.',
  'auth/user-disabled': 'Esta conta está desativada.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente novamente.',
  'auth/timeout': 'A requisição demorou demais. Tente novamente.',
  'auth/operation-not-allowed': 'O login com email e senha não está habilitado neste projeto.',
  'auth/requires-recent-login': 'Faça login novamente para continuar.',
}

export const DEFAULT_AUTH_ERROR_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.'

const readErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  const { code } = error as { code?: unknown }

  return typeof code === 'string' ? code : null
}

export const authErrorMessage = (error: unknown, fallback = DEFAULT_AUTH_ERROR_MESSAGE): string => {
  const code = readErrorCode(error)

  if (code === null) {
    return fallback
  }

  return AUTH_ERROR_MESSAGES[code] ?? fallback
}
