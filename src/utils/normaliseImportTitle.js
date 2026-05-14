/** Normalise task titles for duplicate detection (import modal, Drop Zone). */
export function normaliseImportTitle(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/[.,:;!?"'()[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
