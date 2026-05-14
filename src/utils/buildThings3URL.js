const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const DEFAULT_THINGS3_LIST_ID = 'Ss74hokfhtNEepoLe2wewj'

export const DEFAULT_THINGS3_TAG_MAP = {
  Critical: '🔴 Critical',
  High: '🔴 High',
  Medium: '🟡 Medium',
  Low: '🟢 Low',
}

function tagForPriority(priority, tagMap) {
  const p = String(priority ?? 'Medium').trim()
  if (tagMap[p] != null) return tagMap[p]
  const cap = p.length
    ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    : 'Medium'
  if (tagMap[cap] != null) return tagMap[cap]
  return DEFAULT_THINGS3_TAG_MAP.Medium
}

/**
 * @param {Array<{ title?: string, description?: string, priority?: string, dueDate?: string, source?: string }>} tasks
 * @param {{ listId: string, tagMap: Record<string, string> }} config
 * @returns {string} things:///json?data=...
 */
export function buildThings3URL(tasks, config) {
  const listId =
    typeof config?.listId === 'string' && config.listId.trim()
      ? config.listId.trim()
      : DEFAULT_THINGS3_LIST_ID
  const tagMap =
    config?.tagMap && typeof config.tagMap === 'object'
      ? { ...DEFAULT_THINGS3_TAG_MAP, ...config.tagMap }
      : { ...DEFAULT_THINGS3_TAG_MAP }

  const items = []
  for (const task of tasks || []) {
    const title = String(task?.title ?? '').trim()
    if (!title) continue

    const description = String(task?.description ?? '').trim()
    const source = String(task?.source ?? '').trim()
    let notes = description
    if (source) {
      notes = notes ? `${notes}\n\n[Source: ${source}]` : `[Source: ${source}]`
    }
    notes = notes.trim()

    const tag = tagForPriority(task?.priority, tagMap)

    const due = String(task?.dueDate ?? '').trim()
    const hasDeadline = due && DATE_RE.test(due)

    const attributes = {
      title,
      notes,
      'list-id': listId,
      tags: [tag],
    }
    if (hasDeadline) {
      attributes.deadline = due
    }

    items.push({
      type: 'to-do',
      attributes,
    })
  }

  const payload = JSON.stringify(items)
  return `things:///json?data=${encodeURIComponent(payload)}`
}
