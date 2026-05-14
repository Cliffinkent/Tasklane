import { useCallback, useEffect, useState } from 'react'

const HISTORY_KEY = 'tasklane-dropzone-history'

function loadHistoryEntries() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (_) {
    return []
  }
}

function isValidEntry(e) {
  return (
    e &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    typeof e.timestamp === 'string' &&
    (e.destination === 'tasklane' || e.destination === 'things3') &&
    typeof e.taskCount === 'number' &&
    Array.isArray(e.taskTitles)
  )
}

/** @param {string} iso */
export function formatDropzoneHistoryTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = Date.now()
  const diffMs = now - d.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  if (diffMs >= 0 && diffMs < dayMs) {
    const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return rtf.format(-mins, 'minute')
    const hours = Math.floor(diffMs / 3600000)
    return rtf.format(-hours, 'hour')
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

export default function DropZoneHistory({ isActive }) {
  const [entries, setEntries] = useState([])
  const [expandedIds, setExpandedIds] = useState(() => new Set())
  const [confirmClear, setConfirmClear] = useState(false)

  const refresh = useCallback(() => {
    setEntries(
      loadHistoryEntries()
        .filter(isValidEntry)
        .sort(
          (a, b) =>
            (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0)
        )
    )
  }, [])

  useEffect(() => {
    if (!isActive) {
      setConfirmClear(false)
      return
    }
    refresh()
  }, [isActive, refresh])

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleConfirmClear() {
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch (_) {}
    setEntries([])
    setConfirmClear(false)
    setExpandedIds(new Set())
  }

  return (
    <div className="dropzone-history">
      <div className="dropzone-history-toolbar">
        <button
          type="button"
          className="btn btn-ghost btn--compact dropzone-clear-list-btn"
          onClick={() => setConfirmClear(true)}
          disabled={entries.length === 0}
        >
          Clear History
        </button>
      </div>
      {confirmClear ? (
        <div
          className="dropzone-history-confirm"
          role="dialog"
          aria-labelledby="dropzone-clear-history-heading"
        >
          <p id="dropzone-clear-history-heading" className="dropzone-history-confirm-text">
            Clear all history?
          </p>
          <div className="dropzone-history-confirm-actions">
            <button
              type="button"
              className="btn btn-primary btn--compact"
              onClick={handleConfirmClear}
            >
              Yes
            </button>
            <button
              type="button"
              className="btn btn-ghost btn--compact"
              onClick={() => setConfirmClear(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {entries.length === 0 ? (
        <div className="empty-state" role="status">
          <div className="empty-state-inner">
            <div className="empty-state-panel">
              <p className="empty-state-message">
                No imports yet. Tasks you add to the board or export to Things 3
                will appear here.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ul className="import-preview-list dropzone-history-list">
          {entries.map((entry) => {
            const expanded = expandedIds.has(entry.id)
            const destLabel =
              entry.destination === 'things3' ? 'Things 3' : 'Tasklane'
            const badgeClass =
              entry.destination === 'things3'
                ? 'priority-badge priority-badge--high'
                : 'priority-badge priority-badge--medium'

            return (
              <li key={entry.id} className="import-preview-item dropzone-history-item">
                <div className="import-preview-main">
                  <div className="dropzone-history-header">
                    <div className="dropzone-history-header-left">
                      <span className={badgeClass}>{destLabel}</span>
                      <span className="dropzone-history-count">
                        {entry.taskCount} task{entry.taskCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <time
                      className="dropzone-history-time"
                      dateTime={entry.timestamp}
                    >
                      {formatDropzoneHistoryTime(entry.timestamp)}
                    </time>
                  </div>
                  {entry.taskTitles.length > 0 ? (
                    <>
                      <button
                        type="button"
                        className="import-prompt-toggle dropzone-history-tasks-toggle"
                        aria-expanded={expanded}
                        onClick={() => toggleExpanded(entry.id)}
                      >
                        {expanded ? 'Hide tasks ▾' : 'Show tasks ▸'}
                      </button>
                      {expanded ? (
                        <ul className="dropzone-history-titles">
                          {entry.taskTitles.map((title, i) => (
                            <li key={`${entry.id}-t-${i}`}>
                              <span className="import-preview-description dropzone-history-title-line">
                                {title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
