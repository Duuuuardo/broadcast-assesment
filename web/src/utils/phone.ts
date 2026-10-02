const ALLOWED_CHARACTERS = /^[0-9+()\s-]+$/

const MIN_DIGITS = 8

const MAX_DIGITS = 15

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

  const digits = phone.replace(/\D/g, '')

  if (digits.length < MIN_DIGITS) {
    return `O telefone precisa ter ao menos ${MIN_DIGITS} dígitos.`
  }

  if (digits.length > MAX_DIGITS) {
    return `O telefone precisa ter no máximo ${MAX_DIGITS} dígitos.`
  }

  if (new Set(digits).size === 1) {
    return 'Informe um telefone válido.'
  }

  return null
}
