import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const AUTO_DISMISS_MS = 10_000

export default function ClipboardToast() {
  const navigate = useNavigate()
  const [payload, setPayload] = useState(null)
  const autoDismissRef = useRef(null)

  const clearTimers = useCallback(() => {
    if (autoDismissRef.current) {
      window.clearTimeout(autoDismissRef.current)
      autoDismissRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setPayload(null)
    window.electronAPI?.dismissTasksDetected?.()
  }, [clearTimers])

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.onTasksDetected) return undefined

    const unsubscribe = api.onTasksDetected((rawText) => {
      if (typeof rawText !== 'string' || !rawText.trim()) return
      setPayload({ raw: rawText, token: Date.now() })
    })

    return () => {
      unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!payload) {
      clearTimers()
      return undefined
    }
    clearTimers()
    autoDismissRef.current = window.setTimeout(() => {
      dismiss()
    }, AUTO_DISMISS_MS)
    return () => clearTimers()
  }, [payload, dismiss, clearTimers])

  if (!window.electronAPI?.onTasksDetected || !payload) return null

  function handleOpenDropZone() {
    clearTimers()
    window.electronAPI?.acknowledgeTasksDetected?.()
    navigate('/dropzone', { state: { clipboardJSON: payload.raw } })
    setPayload(null)
  }

  function handleDismissClick() {
    dismiss()
  }

  return (
    <div className="clipboard-toast" role="status" aria-live="polite">
      <p className="clipboard-toast-message">
        Tasks detected on clipboard
      </p>
      <div className="clipboard-toast-actions">
        <button
          type="button"
          className="btn btn-primary btn--compact"
          onClick={handleOpenDropZone}
        >
          Open Drop Zone
        </button>
        <button
          type="button"
          className="btn btn-ghost btn--compact"
          onClick={handleDismissClick}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
