import dayjs from 'dayjs'

export function formatDate(value?: string | null, format = 'DD/MM/YYYY') {
  if (!value) return '-'
  return dayjs(value).format(format)
}

export function toIsoDate(value?: Date | string | null) {
  if (!value) return undefined
  return dayjs(value).toDate().toISOString()
}
