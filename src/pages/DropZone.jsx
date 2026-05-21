import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import DropZoneHistory from '../components/DropZoneHistory'
import DropZonePromptShelf from '../components/DropZonePromptShelf'
import DropZonePasteArea from '../components/DropZonePasteArea'
import DropZoneTaskPreview from '../components/DropZoneTaskPreview'
import { DESTINATION_TASKLANE, DESTINATION_THINGS3 } from '../components/DestinationToggle'
import { parseDropZoneJSON } from '../utils/parseDropZoneJSON'
import {
  buildThings3URL,
  DEFAULT_THINGS3_LIST_ID,
  DEFAULT_THINGS3_TAG_MAP,
} from '../utils/buildThings3URL'

const DROPZONE_HISTORY_KEY = 'tasklane-dropzone-history'
const LS_THINGS3_LIST_ID = 'tasklane-dropzone-things3-listid'
const LS_THINGS3_TAGS = 'tasklane-dropzone-things3-tags'

function appendDropzoneHistory(entry) {
  try {
    const raw = localStorage.getItem(DROPZONE_HISTORY_KEY)
    const prev = raw ? JSON.parse(raw) : []
    const list = Array.isArray(prev) ? prev : []
    const next = [entry, ...list].slice(0, 50)
    localStorage.setItem(DROPZONE_HISTORY_KEY, JSON.stringify(next))
  } catch (_) {}
}

function readThings3ExportConfig() {
  let listId = DEFAULT_THINGS3_LIST_ID
  try {
    const v = localStorage.getItem(LS_THINGS3_LIST_ID)
    if (typeof v === 'string' && v.trim()) listId = v.trim()
  } catch (_) {}
  let tagMap = { ...DEFAULT_THINGS3_TAG_MAP }
  try {
    const raw = localStorage.getItem(LS_THINGS3_TAGS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        tagMap = { ...DEFAULT_THINGS3_TAG_MAP, ...parsed }
      }
    }
  } catch (_) {}
  return { listId, tagMap }
}

export default function DropZone({ tasks: boardTasks = [], addBoardTasks }) {
  const location = useLocation()
  const navigate = useNavigate()
  const navImportHandledRef = useRef(false)
  const [destination, setDestination] = useState(DESTINATION_TASKLANE)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dropTasks, setDropTasks] = useState([])
  const [boardToast, setBoardToast] = useState(null)
  const [activeTab, setActiveTab] = useState('import')

  const clearPreview = useCallback(() => {
    setPreviewOpen(false)
    setDropTasks([])
    setParseError(null)
    setPasteText('')
  }, [])

  const commitParsed = useCallback((result, textUsed) => {
    setParseError(null)
    setPasteText(textUsed)
    setDropTasks(result.tasks)
    setPreviewOpen(true)
    if (result.detectedFormat === 'things') {
      setDestination(DESTINATION_THINGS3)
    } else if (result.detectedFormat === 'tasklane') {
      setDestination(DESTINATION_TASKLANE)
    }
  }, [])

  const tryAutoParse = useCallback(
    (text) => {
      const trimmed = String(text ?? '')
        .trim()
        .replace(/^\uFEFF/, '')
      if (!/^[\[{]/.test(trimmed)) return
      const r = parseDropZoneJSON(text)
      if (r.errors.length > 0 || r.tasks.length === 0) return
      commitParsed(r, trimmed)
    },
    [commitParsed]
  )

  const handleParse = useCallback(async () => {
    setParseError(null)
    let text = pasteText.trim().replace(/^\uFEFF/, '')
    if (!text && navigator.clipboard?.readText) {
      try {
        text = (await navigator.clipboard.readText()).trim().replace(/^\uFEFF/, '')
      } catch {
        // ignore
      }
    }
    if (!text) {
      setParseError(
        'Nothing to parse yet. Paste a Copilot reply or JSON, or copy it to the clipboard.'
      )
      return
    }
    const r = parseDropZoneJSON(text)
    if (r.errors.length > 0) {
      setParseError(r.errors[0])
      return
    }
    commitParsed(r, text)
  }, [pasteText, commitParsed])

  const handleImportToBoard = useCallback(() => {
    const selected = dropTasks.filter((t) => t.selected)
    if (!selected.length) return

    if (typeof addBoardTasks !== 'function') {
      setBoardToast({
        type: 'error',
        message: 'Could not add tasks — board state unavailable.',
      })
      return
    }

    const payloads = selected.map((t) => ({
      title: t.title,
      description: String(t.description ?? '').trim(),
      priority: t.priority,
      taskType: t.taskType,
      owner: String(t.owner ?? '').trim(),
      dueDate: String(t.dueDate ?? '').trim(),
    }))

    const count = addBoardTasks(payloads)
    if (!count || count < 1) {
      setBoardToast({
        type: 'error',
        message: 'No tasks could be added.',
      })
      return
    }

    appendDropzoneHistory({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      destination: 'tasklane',
      taskCount: count,
      taskTitles: selected
        .map((t) => String(t.title ?? '').trim())
        .filter(Boolean),
    })

    window.electronAPI?.acknowledgeTasksDetected?.()
    clearPreview()
    setBoardToast({ type: 'success', count, variant: 'board' })
  }, [dropTasks, addBoardTasks, clearPreview])

  const handleExportToThings = useCallback(async () => {
    const selected = dropTasks.filter((t) => t.selected)
    if (!selected.length) return

    const toExport = selected.filter((t) => String(t.title ?? '').trim())
    if (!toExport.length) {
      setBoardToast({
        type: 'error',
        message: 'No tasks with titles to export.',
      })
      return
    }

    const { listId, tagMap } = readThings3ExportConfig()
    const url = buildThings3URL(toExport, { listId, tagMap })

    let result = { success: false, error: '' }
    if (window.electronAPI?.openExternalURL) {
      try {
        result = await window.electronAPI.openExternalURL(url)
      } catch (e) {
        result = { success: false, error: String(e?.message || e) }
      }
    } else {
      try {
        window.open(url, '_blank', 'noopener,noreferrer')
        result = { success: true }
      } catch {
        result = {
          success: false,
          error: 'Could not open URL in this environment.',
        }
      }
    }

    if (!result?.success) {
      setBoardToast({
        type: 'error',
        message: result?.error || 'Could not open Things 3.',
      })
      return
    }

    const exported = toExport.length

    appendDropzoneHistory({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      destination: 'things3',
      taskCount: exported,
      taskTitles: toExport
        .map((t) => String(t.title ?? '').trim())
        .filter(Boolean),
    })

    window.electronAPI?.acknowledgeTasksDetected?.()
    clearPreview()
    setBoardToast({ type: 'success', count: exported, variant: 'things3' })
  }, [dropTasks, clearPreview])

  useEffect(() => {
    if (!boardToast) return undefined
    const ms = boardToast.type === 'error' ? 7000 : 10_000
    const t = window.setTimeout(() => setBoardToast(null), ms)
    return () => window.clearTimeout(t)
  }, [boardToast])

  function handlePasteTextChange(v) {
    setPasteText(v)
    if (parseError) setParseError(null)
  }

  const clipJson =
    typeof location.state?.clipboardJSON === 'string'
      ? location.state.clipboardJSON
      : null

  useEffect(() => {
    if (!clipJson) {
      navImportHandledRef.current = false
      return
    }
    if (navImportHandledRef.current) return
    navImportHandledRef.current = true

    const trimmed = clipJson.trim().replace(/^\uFEFF/, '')
    navigate('.', { replace: true, state: {} })
    if (!trimmed) return
    const r = parseDropZoneJSON(clipJson)
    if (r.errors.length > 0 || r.tasks.length === 0) return
    setParseError(null)
    setPasteText(trimmed)
    setDropTasks(r.tasks)
    setPreviewOpen(true)
    if (r.detectedFormat === 'things') {
      setDestination(DESTINATION_THINGS3)
    } else if (r.detectedFormat === 'tasklane') {
      setDestination(DESTINATION_TASKLANE)
    }
  }, [clipJson, navigate])

  return (
    <>
      <div className="dropzone-page">
        <div className="dropzone-workspace">
          <div
            className="destination-toggle dropzone-workspace-tabs"
            role="tablist"
            aria-label="Drop zone section"
          >
            <button
              type="button"
              className="destination-toggle__segment"
              aria-pressed={activeTab === 'import'}
              onClick={() => setActiveTab('import')}
            >
              Import
            </button>
            <button
              type="button"
              className="destination-toggle__segment"
              aria-pressed={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
            >
              History
            </button>
          </div>
          {activeTab === 'import' ? (
            <>
              <DropZonePromptShelf
                destination={destination}
                onDestinationChange={setDestination}
              />
              <DropZonePasteArea
                pasteText={pasteText}
                onPasteTextChange={handlePasteTextChange}
                parseError={parseError}
                parsedLocked={previewOpen}
                onParse={handleParse}
                onPastedMaybeAutoParse={tryAutoParse}
              />
              {!previewOpen ? (
                <div className="empty-state" role="status">
                  <div className="empty-state-inner">
                    <div className="empty-state-panel">
                      <p className="empty-state-message">
                        Paste a Copilot reply or JSON, then click Parse.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {previewOpen && dropTasks.length > 0 ? (
                <DropZoneTaskPreview
                  tasks={dropTasks}
                  setTasks={setDropTasks}
                  boardTasks={boardTasks}
                  destination={destination}
                  onDestinationChange={setDestination}
                  onClearList={clearPreview}
                  onAddToBoard={handleImportToBoard}
                  onExportToThings={handleExportToThings}
                />
              ) : null}
            </>
          ) : (
            <DropZoneHistory isActive={activeTab === 'history'} />
          )}
        </div>
      </div>
      {boardToast?.type === 'success' ? (
        <div className="undo-toast dropzone-board-toast" role="status">
          <span className="undo-toast-message">
            {boardToast.variant === 'things3'
              ? `Exported ${boardToast.count} task${
                  boardToast.count === 1 ? '' : 's'
                } to Things 3`
              : `Added ${boardToast.count} task${
                  boardToast.count === 1 ? '' : 's'
                } to Backlog`}
          </span>
          {boardToast.variant !== 'things3' ? (
            <Link
              to="/"
              className="btn btn-ghost btn--compact"
              onClick={() => setBoardToast(null)}
            >
              View Board
            </Link>
          ) : null}
        </div>
      ) : null}
      {boardToast?.type === 'error' ? (
        <div className="undo-toast dropzone-board-toast" role="alert">
          <span className="undo-toast-message">{boardToast.message}</span>
        </div>
      ) : null}
    </>
  )
}
