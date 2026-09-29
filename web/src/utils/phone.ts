const ALLOWED_CHARACTERS = /^[0-9+()\s-]+$/

const MIN_DIGITS = 8

export const countPhoneDigits = (value: string): number => value.replace(/\D/g, '').length

export const phoneValidationMessage = (value: string): string | null => {
  const phone = value.trim()

  if (phone === '') {
    return 'Informe o telefone do contato.'
  }

  if (!ALLOWED_CHARACTERS.test(phone)) {
    return 'Use apenas números, espaços e os sinais + ( ) -.'
  }

  if (phone.includes('+') && !phone.startsWith('+')) {
    return 'Use o sinal + apenas no início do telefone.'
  }

  if (countPhoneDigits(phone) < MIN_DIGITS) {
    return `O telefone precisa ter ao menos ${MIN_DIGITS} dígitos.`
  }

  return null
}
