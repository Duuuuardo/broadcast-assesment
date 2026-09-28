const DATA_ERROR_MESSAGES: Record<string, string> = {
  'permission-denied': 'Você não tem permissão para acessar estes dados.',
  unauthenticated: 'Sua sessão expirou. Entre novamente para continuar.',
  unavailable: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.',
  'deadline-exceeded': 'A requisição demorou demais. Tente novamente.',
  cancelled: 'A operação foi cancelada.',
  aborted: 'A operação foi cancelada. Tente novamente.',
  'not-found': 'O registro não existe mais.',
  'already-exists': 'Já existe um registro com estes dados.',
  'resource-exhausted': 'Você fez muitas operações seguidas. Aguarde alguns instantes.',
  'failed-precondition': 'A operação não está disponível no momento. Tente novamente.',
  internal: 'O servidor encontrou um erro. Tente novamente em instantes.',
  unknown: 'Não foi possível concluir a operação. Tente novamente.',
}

export const DEFAULT_DATA_ERROR_MESSAGE = 'Não foi possível concluir a operação. Tente novamente.'

const readErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  const { code } = error as { code?: unknown }

  return typeof code === 'string' ? code : null
}

export const dataErrorMessage = (error: unknown, fallback = DEFAULT_DATA_ERROR_MESSAGE): string => {
  const code = readErrorCode(error)

  if (code === null) {
    return fallback
  }

  return DATA_ERROR_MESSAGES[code] ?? fallback
}

export const isErrorCode = (error: unknown, ...codes: string[]): boolean => {
  const code = readErrorCode(error)

  return code !== null && codes.includes(code)
}
