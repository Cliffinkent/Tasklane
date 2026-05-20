import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  rectIntersection,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'
import {
  TASK_TYPES,
  PRIORITIES,
  normaliseTaskType,
  DEFAULT_TASK_TYPE,
} from '../data/taskMetadata'
import Column from './Column'
import TaskForm from './TaskForm'
import Card, { CardContent } from './Card'
import { parseDropZoneJSON } from '../utils/parseDropZoneJSON'
import { normaliseImportTitle } from '../utils/normaliseImportTitle'
import { formatDateLabel } from '../utils/formatDateLabel'

const TASKLANE_COPILOT_IMPORT_PROMPT = `You are helping me maintain my Tasklane agile task board.

Review my recent emails and Teams messages and identify concrete actions I need to track.

Return JSON only. Do not include markdown, commentary, headings, or explanations.

Use this exact schema:

{
  "tasks": [
    {
      "title": "Short action title",
      "description": "Useful context from the email or Teams message",
      "priority": "Low | Medium | High | Critical",
      "taskType": "Discovery | Assessment | Planning | Execution | Validation | Follow-up",
      "owner": "Person or team if explicitly known, otherwise empty string",
      "dueDate": "YYYY-MM-DD if explicitly stated, otherwise empty string",
      "source": "Email | Teams | Meeting | Other"
    }
  ]
}

Rules:
- Only include concrete actions, commitments, follow-ups, blockers, or decisions that need tracking.
- Do not include general updates unless they require action.
- Do not invent due dates.
- Do not invent owners.
- Keep titles concise and action-oriented.
- Put useful context in the description.
- Use priority Medium unless the message clearly indicates urgency or impact.
- Use source Email for email-derived actions.
- Use source Teams for Teams-derived actions.
- Use source Meeting for meeting-derived actions.
- Return valid JSON only.`

function previewPriorityVariant(p) {
  switch (p) {
    case 'Low':
      return 'low'
    case 'High':
      return 'high'
    case 'Critical':
      return 'critical'
    default:
      return 'medium'
  }
}

function sortTasksByOrder(tasks) {
  return [...tasks].sort(
    (a, b) =>
      (Number(a.order) || 0) - (Number(b.order) || 0) ||
      String(a.id).localeCompare(String(b.id))
  )
}

/** Map droppable id `drop:<taskId>` back to task id for reposition logic. */
function normaliseDropOverId(id) {
  const s = String(id)
  return s.startsWith('drop:') ? s.slice(5) : s
}

function filterBoardTasks(tasks, filters) {
  const { search, status, epic, taskType, priority } = filters
  const needle = search.trim().toLowerCase()
  return tasks.filter((t) => {
    if (status !== 'all' && t.columnId !== status) return false
    if (epic === 'none' && t.epicId) return false
    if (epic !== 'all' && epic !== 'none' && t.epicId !== epic) return false
    if (
      taskType !== 'all' &&
      normaliseTaskType(t.taskType ?? '', DEFAULT_TASK_TYPE) !== taskType
    ) {
      return false
    }
    if (priority !== 'all' && (t.priority ?? 'Medium') !== priority) {
      return false
    }
    if (needle) {
      const title = (t.title || '').toLowerCase()
      const desc = (t.description || '').toLowerCase()
      const owner = (t.owner || '').toLowerCase()
      if (
        !title.includes(needle) &&
        !desc.includes(needle) &&
        !owner.includes(needle)
      ) {
        return false
      }
    }
    return true
  })
}

function collisionType(collision) {
  return collision?.data?.droppableContainer?.data?.current?.type
}

function columnAwareCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args)

  if (pointerCollisions.length > 0) {
    const taskCollision = pointerCollisions.find(
      (collision) => collisionType(collision) === 'task'
    )
    const columnCollision = pointerCollisions.find(
      (collision) => collisionType(collision) === 'column'
    )

    if (taskCollision && columnCollision) return [taskCollision, columnCollision]
    if (taskCollision) return [taskCollision]
    if (columnCollision) return [columnCollision]
    return pointerCollisions
  }

  const rectCollisions = rectIntersection(args)
  if (rectCollisions.length > 0) {
    const taskCollision = rectCollisions.find(
      (collision) => collisionType(collision) === 'task'
    )
    const columnCollision = rectCollisions.find(
      (collision) => collisionType(collision) === 'column'
    )

    if (taskCollision && columnCollision) return [taskCollision, columnCollision]
    if (taskCollision) return [taskCollision]
    if (columnCollision) return [columnCollision]
    return rectCollisions
  }

  return closestCenter(args)
}

export default function Board({
  tasks,
  epics,
  templates = [],
  onCreateTask,
  onCreateTasks = () => 0,
  onRepositionTask,
  onUpdateTask,
  onDeleteTask,
  onArchiveTask,
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [draftDefaults, setDraftDefaults] = useState(null)
  const [templateSelectKey, setTemplateSelectKey] = useState(0)
  const [createFormNonce, setCreateFormNonce] = useState(0)
  const [activeId, setActiveId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [epicFilter, setEpicFilter] = useState('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const [showImportModal, setShowImportModal] = useState(false)
  const [importStep, setImportStep] = useState('paste')
  const [importRaw, setImportRaw] = useState('')
  const [importParsedTasks, setImportParsedTasks] = useState([])
  const [importWarnings, setImportWarnings] = useState([])
  const [importSelectedIndices, setImportSelectedIndices] = useState(
    () => new Set()
  )
  const [showCopilotPrompt, setShowCopilotPrompt] = useState(false)
  const [copyPromptStatus, setCopyPromptStatus] = useState('')
  const [importClipboardDetected, setImportClipboardDetected] = useState(false)

  const navigate = useNavigate()
  const modalOpen = showForm || Boolean(editingTaskId)

  function resetImportModal() {
    setImportStep('paste')
    setImportRaw('')
    setImportParsedTasks([])
    setImportWarnings([])
    setImportSelectedIndices(new Set())
    setImportClipboardDetected(false)
  }

  function closeImportModal() {
    setShowImportModal(false)
    setShowCopilotPrompt(false)
    setCopyPromptStatus('')
    resetImportModal()
  }

  function handleCopyCopilotPrompt() {
    if (!navigator.clipboard?.writeText) {
      setCopyPromptStatus(
        'Copy failed. Select the prompt text manually.'
      )
      return
    }
    navigator.clipboard
      .writeText(TASKLANE_COPILOT_IMPORT_PROMPT)
      .then(() => {
        setCopyPromptStatus('Copied')
      })
      .catch(() => {
        setCopyPromptStatus(
          'Copy failed. Select the prompt text manually.'
        )
      })
  }

  function openImportModal() {
    resetImportModal()
    setShowImportModal(true)
    setImportStep('paste')
  }

  function handleOpenDropZone() {
    const state =
      importClipboardDetected && importRaw.trim()
        ? { clipboardJSON: importRaw.trim() }
        : undefined
    closeImportModal()
    navigate('/dropzone', state ? { state } : {})
  }
  useEffect(() => {
    if (!showImportModal) return undefined

    let cancelled = false

    async function readClipboardText() {
      try {
        const apiRead = window.electronAPI?.readClipboard
        if (typeof apiRead === 'function') {
          const v = await Promise.resolve(apiRead())
          if (typeof v === 'string' && v.trim()) return v
        }
      } catch {
        // ignore
      }
      try {
        if (navigator.clipboard?.readText) {
          return await navigator.clipboard.readText()
        }
      } catch {
        // ignore
      }
      return ''
    }

    ;(async () => {
      try {
        const raw = await readClipboardText()
        if (cancelled) return
        const trimmed = String(raw ?? '').trim().replace(/^\uFEFF/, '')
        if (!trimmed) return
        const r = parseDropZoneJSON(trimmed)
        if (r.errors.length > 0 || r.tasks.length === 0) return
        let applied = false
        setImportRaw((prev) => {
          if (prev.trim()) return prev
          applied = true
          return trimmed
        })
        if (applied) setImportClipboardDetected(true)
      } catch {
        // silent
      }
    })()

    return () => {
      cancelled = true
    }
  }, [showImportModal])

  function handleImportPreviewClick() {
    const r = parseDropZoneJSON(importRaw)
    const warnings = [...r.errors]
    const parsedTasks = r.tasks.map(({ id: _dzId, selected: _sel, ...rest }) => rest)
    if (parsedTasks.length === 0 && warnings.length === 0) {
      warnings.push('No valid tasks found.')
    }
    const existingNormalisedTitles = new Set(
      tasks
        .map((t) => normaliseImportTitle(t.title))
        .filter(Boolean)
    )

    const previewTasks = parsedTasks.map((task, index) => {
      const normalisedTitle = normaliseImportTitle(task.title)
      const isDuplicate = Boolean(normalisedTitle) &&
        existingNormalisedTitles.has(normalisedTitle)
      return {
        ...task,
        previewId: `import-${index}-${normalisedTitle || 'task'}`,
        isDuplicate,
        duplicateReason: isDuplicate
          ? 'Likely duplicate: title already exists'
          : '',
      }
    })

    setImportParsedTasks(previewTasks)
    setImportWarnings(warnings)
    setImportSelectedIndices(
      new Set(
        previewTasks
          .map((task, idx) => (task.isDuplicate ? null : idx))
          .filter((value) => value !== null)
      )
    )
    setImportStep('preview')
  }

  function toggleImportSelected(index) {
    setImportSelectedIndices((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function handleImportBack() {
    setImportStep('paste')
    setImportParsedTasks([])
    setImportWarnings([])
    setImportSelectedIndices(new Set())
  }

  function handleImportCreateSelected() {
    const ordered = [...importSelectedIndices].sort((a, b) => a - b)
    const payloads = ordered.map((i) => {
      const t = importParsedTasks[i]
      return {
        title: t.title,
        description: t.description,
        priority: t.priority,
        taskType: t.taskType,
        owner: t.owner,
        dueDate: t.dueDate,
      }
    })
    if (!payloads.length) return
    const created = onCreateTasks(payloads)
    if (created > 0) closeImportModal()
  }

  const filters = useMemo(
    () => ({
      search,
      status: statusFilter,
      epic: epicFilter,
      taskType: taskTypeFilter,
      priority: priorityFilter,
    }),
    [search, statusFilter, epicFilter, taskTypeFilter, priorityFilter]
  )

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(search.trim()) ||
      statusFilter !== 'all' ||
      epicFilter !== 'all' ||
      taskTypeFilter !== 'all' ||
      priorityFilter !== 'all'
    )
  }, [search, statusFilter, epicFilter, taskTypeFilter, priorityFilter])

  const filteredTasks = useMemo(
    () => filterBoardTasks(tasks, filters),
    [tasks, filters]
  )

  const visibleByColumn = useMemo(() => {
    const map = Object.fromEntries(COLUMNS.map((c) => [c.id, []]))
    for (const t of filteredTasks) {
      if (map[t.columnId]) map[t.columnId].push(t)
    }
    for (const col of COLUMNS) {
      map[col.id] = sortTasksByOrder(map[col.id])
    }
    return map
  }, [filteredTasks])

  function closeTaskModal() {
    setShowForm(false)
    setEditingTaskId(null)
    setDraftDefaults(null)
  }

  function openBlankCreate() {
    setDraftDefaults(null)
    setEditingTaskId(null)
    setCreateFormNonce((n) => n + 1)
    setShowForm(true)
  }

  function handleTemplateSelect(e) {
    const id = e.target.value
    setTemplateSelectKey((k) => k + 1)
    if (!id) return
    const tmpl = templates.find((t) => t.id === id)
    if (!tmpl) return
    setEditingTaskId(null)
    setCreateFormNonce((n) => n + 1)
    setDraftDefaults({
      templateId: tmpl.id,
      title: tmpl.title,
      description: tmpl.description ?? '',
      taskType: tmpl.taskType,
      priority: tmpl.priority,
      dueDate: typeof tmpl.dueDate === 'string' ? tmpl.dueDate : '',
      owner: typeof tmpl.owner === 'string' ? tmpl.owner : '',
    })
    setShowForm(true)
  }

  useEffect(() => {
    if (editingTaskId && !tasks.some((t) => t.id === editingTaskId)) {
      setEditingTaskId(null)
    }
  }, [tasks, editingTaskId])

  useEffect(() => {
    if (!modalOpen) return
    function onKeyDown(e) {
      if (e.key === 'Escape') closeTaskModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [modalOpen])

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0' } },
    }),
    duration: 220,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    const { active, over } = event
    setActiveId(null)
    if (over && active.id !== over.id) {
      const overId = normaliseDropOverId(over.id)
      if (String(active.id) !== overId) {
        onRepositionTask(String(active.id), overId)
      }
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setEpicFilter('all')
    setTaskTypeFilter('all')
    setPriorityFilter('all')
  }

  const formKey = editingTaskId
    ? `edit-${editingTaskId}`
    : `create-${createFormNonce}-${draftDefaults?.templateId ?? 'blank'}`

  return (
    <div className="board">
      <header className="board-header">
        <div className="board-actions-row board-actions-row--with-templates">
          <div className="board-primary-actions">
            <button
              type="button"
              className="btn btn-primary board-add-task"
              onClick={openBlankCreate}
            >
              Add task
            </button>
            <button
              type="button"
              className="btn btn-secondary board-import-tasks"
              onClick={openImportModal}
            >
              Import tasks
            </button>
            <label className="template-picker" htmlFor="task-template-select">
              <span className="sr-only">Use template</span>
              <select
                key={templateSelectKey}
                id="task-template-select"
                className="template-picker-select"
                defaultValue=""
                disabled={templates.length === 0}
                onChange={handleTemplateSelect}
                aria-label="Use task template"
              >
                <option value="">
                  {templates.length === 0 ? 'No templates' : 'Use template...'}
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.label || tpl.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="board-results-summary" aria-live="polite">
            Showing {filteredTasks.length} of {tasks.length} tasks
          </p>
        </div>
        <div className="board-filters" role="search" aria-label="Board filters">
          <input
            type="search"
            className="board-filter-input"
            placeholder="Search tasks"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tasks"
          />
          <select
            className="board-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            className="board-filter-select"
            value={epicFilter}
            onChange={(e) => setEpicFilter(e.target.value)}
            aria-label="Filter by epic"
          >
            <option value="all">All epics</option>
            <option value="none">No epic</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.name}
              </option>
            ))}
          </select>
          <select
            className="board-filter-select"
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            aria-label="Filter by task type"
          >
            <option value="all">All task types</option>
            {TASK_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
          <select
            className="board-filter-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost board-clear-filters"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>
        </div>
      </header>

      {showImportModal && (
        <div
          className="import-modal-overlay board-form-overlay"
          role="presentation"
        >
          <div
            className="import-modal-panel board-form-panel board-form-panel--import"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-task-dialog-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="import-task-dialog-heading"
              className="import-modal-heading board-modal-title"
            >
              Import tasks
            </h2>
            {importStep === 'paste' ? (
              <>
                <p className="import-modal-help">
                  Paste Copilot JSON with a top-level <code>tasks</code> array.
                  Markdown code fences and surrounding text are OK. Each task
                  should include <code>title</code>, and can optionally include{' '}
                  <code>description</code>, <code>priority</code>,{' '}
                  <code>taskType</code>, <code>owner</code>,{' '}
                  <code>dueDate</code> as <code>YYYY-MM-DD</code>, and{' '}
                  <code>source</code>.
                </p>
                <div className="import-prompt-section">
                  <button
                    type="button"
                    className="import-prompt-toggle"
                    aria-expanded={showCopilotPrompt}
                    onClick={() => setShowCopilotPrompt((v) => !v)}
                  >
                    {showCopilotPrompt
                      ? 'Hide Copilot prompt'
                      : 'Need the Copilot prompt?'}
                  </button>
                  {showCopilotPrompt ? (
                    <div className="import-prompt-panel">
                      <p className="import-prompt-help">
                        Copy this prompt into Copilot, then paste the JSON
                        output below.
                      </p>
                      <div className="import-prompt-actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleCopyCopilotPrompt}
                        >
                          Copy prompt
                        </button>
                      </div>
                      <label
                        className="import-modal-label"
                        htmlFor="import-copilot-prompt-textarea"
                      >
                        Copilot prompt for Tasklane import
                      </label>
                      <textarea
                        id="import-copilot-prompt-textarea"
                        className="import-prompt-textarea task-form-textarea"
                        readOnly
                        value={TASKLANE_COPILOT_IMPORT_PROMPT}
                        spellCheck={false}
                        rows={8}
                      />
                      {copyPromptStatus ? (
                        <div
                          role="status"
                          className={`import-prompt-copy-status ${
                            copyPromptStatus === 'Copied'
                              ? 'import-prompt-copy-status--copied'
                              : 'import-prompt-copy-status--failed'
                          }`}
                        >
                          {copyPromptStatus}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <label className="import-modal-label" htmlFor="import-json-textarea">
                  Paste Copilot JSON
                </label>
                {importClipboardDetected ? (
                  <div
                    role="status"
                    className="import-prompt-copy-status import-prompt-copy-status--clipboard"
                  >
                    JSON detected on clipboard — preview below.
                  </div>
                ) : null}
                <textarea
                  id="import-json-textarea"
                  className="import-modal-textarea task-form-textarea"
                  placeholder='{ "tasks": [ { "title": "…", "description": "…" } ] }'
                  value={importRaw}
                  onChange={(e) => setImportRaw(e.target.value)}
                  rows={10}
                  spellCheck={false}
                />
                <p className="import-modal-dropzone-hint">
                  Need more options?{' '}
                  <button
                    type="button"
                    className="import-modal-dropzone-link"
                    onClick={handleOpenDropZone}
                  >
                    Open Drop Zone →
                  </button>
                </p>
                <div className="import-modal-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleImportPreviewClick}
                  >
                    Preview tasks
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeImportModal}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                {importWarnings.length > 0 ? (
                  <ul className="import-warning-list">
                    {importWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : null}
                {importParsedTasks.length === 0 ? (
                  <p className="import-preview-empty">
                    No valid tasks found.
                  </p>
                ) : (
                  <ul className="import-preview-list">
                    {importParsedTasks.map((t, idx) => (
                      <li
                        key={t.previewId || idx}
                        className={`import-preview-item ${
                          t.isDuplicate ? 'import-preview-item--duplicate' : ''
                        }`}
                      >
                        <label className="import-preview-row">
                          <input
                            type="checkbox"
                            className="import-preview-checkbox"
                            checked={importSelectedIndices.has(idx)}
                            onChange={() => toggleImportSelected(idx)}
                          />
                          <div className="import-preview-main">
                            <span className="import-preview-title">{t.title}</span>
                            <div className="import-preview-meta">
                              <span
                                className={`priority-badge priority-badge--${previewPriorityVariant(t.priority)}`}
                              >
                                {t.priority}
                              </span>
                              <span className="task-type-badge">{t.taskType}</span>
                              <span className="import-source-label">{t.source}</span>
                              {t.dueDate ? (
                                <span className="import-preview-due">
                                  Due {formatDateLabel(t.dueDate)}
                                </span>
                              ) : null}
                              {t.owner ? (
                                <span className="import-preview-owner">{t.owner}</span>
                              ) : null}
                            </div>
                            {t.isDuplicate ? (
                              <p className="import-duplicate-note">{t.duplicateReason}</p>
                            ) : null}
                            {t.description ? (
                              <p className="import-preview-description">
                                {t.description.length > 320
                                  ? `${t.description.slice(0, 317)}…`
                                  : t.description}
                              </p>
                            ) : null}
                          </div>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="import-modal-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={importSelectedIndices.size === 0}
                    onClick={handleImportCreateSelected}
                  >
                    Create selected tasks
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleImportBack}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeImportModal}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {modalOpen && (
        <div
          className="board-form-overlay"
          role="presentation"
          onClick={closeTaskModal}
        >
          <div
            className="board-form-panel board-form-panel--modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-task-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="board-task-dialog-title" className="board-modal-title">
              {editingTaskId ? 'Edit task' : 'Add task'}
            </h2>
            <TaskForm
              key={formKey}
              epics={epics}
              initialTask={
                editingTaskId
                  ? tasks.find((t) => t.id === editingTaskId)
                  : undefined
              }
              draftDefaults={showForm && !editingTaskId ? draftDefaults : undefined}
              onSubmit={(data) => {
                if (editingTaskId) {
                  if (onUpdateTask(editingTaskId, data)) closeTaskModal()
                } else if (showForm) {
                  if (onCreateTask(data)) closeTaskModal()
                }
              }}
              onCancel={closeTaskModal}
            />
          </div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={columnAwareCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {COLUMNS.map((column) => {
            const totalInColumn = tasks.filter(
              (t) => t.columnId === column.id
            ).length
            return (
              <Column
                key={column.id}
                columnId={column.id}
                title={column.title}
                tasks={visibleByColumn[column.id] || []}
                totalInColumn={totalInColumn}
                filtersActive={hasActiveFilters}
                epics={epics}
                onRepositionTask={onRepositionTask}
                onEditTask={(id) => {
                  setDraftDefaults(null)
                  setEditingTaskId(id)
                }}
                onDeleteTask={onDeleteTask}
                onArchiveTask={onArchiveTask}
              />
            )
          })}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="card-overlay-wrapper">
              <CardContent
                task={activeTask}
                epics={epics}
                onMove={() => {}}
                onEdit={null}
                onDelete={null}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
