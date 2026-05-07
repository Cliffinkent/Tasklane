/**
 * Display-only: format stored `YYYY-MM-DD` as dd/mm/yyyy without Date parsing (no TZ shift).
 * @param {unknown} value
 * @returns {string}
 */
export function formatDateLabel(value) {
  if (!value || typeof value !== 'string') return ''
  const s = value.trim()
  if (!s) return ''
  const [year, month, day] = s.split('-')
  if (!year || !month || !day) return s
  return `${day}/${month}/${year}`
}
