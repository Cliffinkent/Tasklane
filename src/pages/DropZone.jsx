import { useState, useCallback } from 'react'
import DropZonePromptShelf from '../components/DropZonePromptShelf'
import DropZonePasteArea from '../components/DropZonePasteArea'
import DropZoneTaskPreview from '../components/DropZoneTaskPreview'
import { DESTINATION_TASKLANE, DESTINATION_THINGS3 } from '../components/DestinationToggle'
import { parseDropZoneJSON } from '../utils/parseDropZoneJSON'

export default function DropZone({ tasks: boardTasks = [] }) {
  const [destination, setDestination] = useState(DESTINATION_TASKLANE)
  const [pasteText, setPasteText] = useState('')
  const [parseError, setParseError] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dropTasks, setDropTasks] = useState([])

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
        'Nothing to parse yet. Paste Copilot JSON or copy it to the clipboard.'
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

  function handlePasteTextChange(v) {
    setPasteText(v)
    if (parseError) setParseError(null)
  }

  return (
    <div className="dropzone-page">
      <div className="dropzone-workspace">
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
                  Copy JSON from Copilot to get started.
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
          />
        ) : null}
      </div>
    </div>
  )
}
