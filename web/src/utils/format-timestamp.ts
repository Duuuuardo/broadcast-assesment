import type { Timestamp } from 'firebase/firestore'

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const TIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
})

export const formatTimestamp = (timestamp: Timestamp | null | undefined): string => {
  if (timestamp === null || timestamp === undefined) {
    return '—'
  }

  const date = timestamp.toDate()

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return `${DATE_FORMATTER.format(date)} às ${TIME_FORMATTER.format(date)}`
}
