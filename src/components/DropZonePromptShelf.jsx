import { useCallback, useEffect, useRef, useState } from 'react'
import DestinationToggle, {
  DESTINATION_TASKLANE,
  DESTINATION_THINGS3,
} from './DestinationToggle'
import {
  DEFAULT_DROPZONE_PROMPT_TASKLANE,
  DEFAULT_DROPZONE_PROMPT_THINGS3,
  DROPZONE_PROMPT_STORAGE_TASKLANE,
  DROPZONE_PROMPT_STORAGE_THINGS3,
  DROPZONE_PROMPT_VERSION_KEY_TASKLANE,
  DROPZONE_PROMPT_VERSION_TASKLANE,
  loadDropZonePrompt,
  saveDropZonePrompt,
} from '../data/dropzonePromptDefaults'

const COPY_DISMISS_MS = 3000

function readStoredPrompt(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (raw != null && raw !== '') return raw
  } catch (_) {}
  return fallback
}

export default function DropZonePromptShelf({ destination, onDestinationChange }) {
  const [shelfOpen, setShelfOpen] = useState(false)
  const [promptTasklane, setPromptTasklane] = useState(() =>
    loadDropZonePrompt(
      DROPZONE_PROMPT_STORAGE_TASKLANE,
      DROPZONE_PROMPT_VERSION_KEY_TASKLANE,
      DROPZONE_PROMPT_VERSION_TASKLANE,
      DEFAULT_DROPZONE_PROMPT_TASKLANE
    )
  )
  const [promptThings3, setPromptThings3] = useState(() =>
    readStoredPrompt(
      DROPZONE_PROMPT_STORAGE_THINGS3,
      DEFAULT_DROPZONE_PROMPT_THINGS3
    )
  )
  const [copyShown, setCopyShown] = useState(false)
  const copyDismissRef = useRef(null)

  const activePrompt =
    destination === DESTINATION_TASKLANE ? promptTasklane : promptThings3

  const persistTasklane = useCallback((next) => {
    setPromptTasklane(next)
    saveDropZonePrompt(
      DROPZONE_PROMPT_STORAGE_TASKLANE,
      DROPZONE_PROMPT_VERSION_KEY_TASKLANE,
      DROPZONE_PROMPT_VERSION_TASKLANE,
      next
    )
  }, [])

  const persistThings3 = useCallback((next) => {
    setPromptThings3(next)
    try {
      window.localStorage.setItem(DROPZONE_PROMPT_STORAGE_THINGS3, next)
    } catch (_) {}
  }, [])

  function handlePromptChange(e) {
    const next = e.target.value
    if (destination === DESTINATION_TASKLANE) persistTasklane(next)
    else persistThings3(next)
  }

  function clearCopyDismissTimer() {
    if (copyDismissRef.current != null) {
      window.clearTimeout(copyDismissRef.current)
      copyDismissRef.current = null
    }
  }

  useEffect(() => () => clearCopyDismissTimer(), [])

  function handleCopyPrompt() {
    clearCopyDismissTimer()
    const text = destination === DESTINATION_TASKLANE ? promptTasklane : promptThings3
    if (!navigator.clipboard?.writeText) {
      return
    }
    navigator.clipboard.writeText(text).then(
      () => {
        setCopyShown(true)
        copyDismissRef.current = window.setTimeout(() => {
          setCopyShown(false)
          copyDismissRef.current = null
        }, COPY_DISMISS_MS)
      },
      () => {}
    )
  }

  function handleResetToDefault() {
    if (destination === DESTINATION_TASKLANE) {
      persistTasklane(DEFAULT_DROPZONE_PROMPT_TASKLANE)
    } else {
      persistThings3(DEFAULT_DROPZONE_PROMPT_THINGS3)
    }
  }

  const promptLabel =
    destination === DESTINATION_TASKLANE
      ? 'Copilot prompt for Tasklane'
      : 'Copilot prompt for Things 3'

  return (
    <div className="import-prompt-section dropzone-prompt-shelf">
      <button
        type="button"
        className="import-prompt-toggle"
        aria-expanded={shelfOpen}
        onClick={() => setShelfOpen((o) => !o)}
      >
        {shelfOpen ? 'Hide Copilot Prompt' : 'Copilot Prompt'}
      </button>
      {shelfOpen ? (
        <div className="import-prompt-panel">
          <DestinationToggle value={destination} onChange={onDestinationChange} />
          <label
            className="import-modal-label"
            htmlFor="dropzone-prompt-textarea"
          >
            {promptLabel}
          </label>
          <textarea
            id="dropzone-prompt-textarea"
            className="import-prompt-textarea task-form-textarea"
            value={activePrompt}
            onChange={handlePromptChange}
            spellCheck={false}
            rows={10}
          />
          <div className="import-prompt-actions dropzone-prompt-actions">
            <button
              type="button"
              className="btn btn-primary btn--compact"
              onClick={handleCopyPrompt}
            >
              Copy Prompt
            </button>
            <button
              type="button"
              className="btn btn-ghost btn--compact"
              onClick={handleResetToDefault}
            >
              Reset to Default
            </button>
          </div>
          {copyShown ? (
            <div
              role="status"
              className="import-prompt-copy-status import-prompt-copy-status--copied"
            >
              Copied to clipboard ✓
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
