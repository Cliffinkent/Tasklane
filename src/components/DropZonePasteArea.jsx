export default function DropZonePasteArea({
  pasteText,
  onPasteTextChange,
  parseError,
  parsedLocked,
  onParse,
  onPastedMaybeAutoParse,
}) {
  function handlePaste(e) {
    const el = e.currentTarget
    queueMicrotask(() => {
      onPastedMaybeAutoParse(el.value)
    })
  }

  return (
    <div className="dropzone-paste-section">
      <div className="dropzone-paste-row">
        <textarea
          id="dropzone-json-paste"
          className={`task-form-textarea dropzone-paste-textarea${
            parsedLocked ? ' dropzone-paste-textarea--parsed' : ''
          }`}
          placeholder="Paste Copilot response or JSON here…"
          value={pasteText}
          onChange={(e) => onPasteTextChange(e.target.value)}
          onPaste={handlePaste}
          disabled={parsedLocked}
          spellCheck={false}
          rows={5}
          aria-invalid={Boolean(parseError)}
          aria-describedby={
            parseError ? 'dropzone-json-parse-error' : 'dropzone-json-paste-hint'
          }
        />
        <button
          type="button"
          className="btn btn-primary dropzone-paste-parse-btn"
          onClick={onParse}
        >
          Parse
        </button>
      </div>
      <p id="dropzone-json-paste-hint" className="dropzone-paste-hint">
        Paste Copilot&apos;s full reply (briefing plus a <code>json</code> code
        block at the bottom) or raw JSON, then click Parse. Tasklane imports the
        JSON block only.
      </p>
      {parseError ? (
        <p id="dropzone-json-parse-error" className="form-error" role="alert">
          {parseError}
        </p>
      ) : null}
    </div>
  )
}
