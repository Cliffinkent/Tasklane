import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_THINGS3_LIST_ID } from '../utils/buildThings3URL'

const LS_THINGS3_LIST_ID = 'tasklane-dropzone-things3-listid'

function readListId() {
  try {
    const v = localStorage.getItem(LS_THINGS3_LIST_ID)
    return typeof v === 'string' ? v : ''
  } catch {
    return ''
  }
}

function writeListId(value) {
  try {
    const t = String(value ?? '').trim()
    if (!t) localStorage.removeItem(LS_THINGS3_LIST_ID)
    else localStorage.setItem(LS_THINGS3_LIST_ID, t)
  } catch {
    // ignore
  }
}

export default function DropZoneSidebarSettings() {
  const [things3ListId, setThings3ListId] = useState(readListId)
  const [clipboardWatcher, setClipboardWatcher] = useState(true)
  const [clipboardReady, setClipboardReady] = useState(false)

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.getClipboardWatcherEnabled) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const v = await api.getClipboardWatcherEnabled()
        if (!cancelled && typeof v === 'boolean') setClipboardWatcher(v)
      } catch {
        // keep default
      } finally {
        if (!cancelled) setClipboardReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const handleThings3Change = useCallback((e) => {
    const next = e.target.value
    setThings3ListId(next)
    writeListId(next)
  }, [])

  const handleClipboardToggle = useCallback((e) => {
    const next = e.target.checked
    setClipboardWatcher(next)
    try {
      window.electronAPI?.setClipboardWatcherEnabled?.(next)
    } catch {
      // ignore
    }
  }, [])

  return (
    <section
      className="dropzone-sidebar-settings"
      aria-labelledby="dropzone-sidebar-settings-heading"
    >
      <h2 id="dropzone-sidebar-settings-heading" className="dropzone-sidebar-settings-title">
        Drop Zone Settings
      </h2>
      <div className="task-form-field dropzone-sidebar-settings-field">
        <label className="task-form-label task-form-label--block" htmlFor="dropzone-things3-list-id">
          Things 3 Project ID
        </label>
        <input
          id="dropzone-things3-list-id"
          type="text"
          className="task-form-input"
          value={things3ListId}
          onChange={handleThings3Change}
          placeholder={DEFAULT_THINGS3_LIST_ID}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
      {clipboardReady && window.electronAPI?.setClipboardWatcherEnabled ? (
        <div className="task-form-field dropzone-sidebar-settings-field">
          <label className="dropzone-sidebar-settings-toggle">
            <span className="task-form-label task-form-label--block">
              Clipboard watcher
            </span>
            <input
              type="checkbox"
              role="switch"
              className="dropzone-sidebar-settings-switch"
              checked={clipboardWatcher}
              onChange={handleClipboardToggle}
              aria-checked={clipboardWatcher}
            />
          </label>
        </div>
      ) : null}
    </section>
  )
}
