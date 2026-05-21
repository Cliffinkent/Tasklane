import { useMemo, useState, useCallback } from 'react'
import { TASK_TYPES } from '../data/taskMetadata'
import { formatDateLabel } from '../utils/formatDateLabel'
import { normaliseImportTitle } from '../utils/normaliseImportTitle'
import DestinationToggle, {
  DESTINATION_TASKLANE,
  DESTINATION_THINGS3,
} from './DestinationToggle'

const SOURCE_OPTIONS = ['Email', 'Teams', 'Meeting', 'Other', 'Proactive']

const TASKLANE_PRIORITY_CYCLE = ['Critical', 'High', 'Medium', 'Low']
const THINGS_PRIORITY_CYCLE = ['High', 'Medium', 'Low']

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

function priorityEmoji(priority, destination) {
  if (destination === DESTINATION_THINGS3) {
    if (priority === 'High') return ' 🔴'
    if (priority === 'Medium') return ' 🟡'
    if (priority === 'Low') return ' 🟢'
    return ''
  }
  if (priority === 'Critical') return ' 🔴'
  if (priority === 'High') return ' 🟠'
  if (priority === 'Medium') return ' 🔵'
  if (priority === 'Low') return ' ⚫'
  return ''
}

function cyclePriority(current, destination) {
  const order =
    destination === DESTINATION_THINGS3
      ? THINGS_PRIORITY_CYCLE
      : TASKLANE_PRIORITY_CYCLE
  let idx = order.indexOf(current)
  if (idx < 0) idx = 0
  return order[(idx + 1) % order.length]
}

function cycleEnum(current, list) {
  const idx = list.indexOf(current)
  const i = idx < 0 ? 0 : (idx + 1) % list.length
  return list[i]
}

function descriptionIsLong(desc) {
  if (!desc) return false
  if (desc.split('\n').length > 2) return true
  return desc.length > 160
}

function mergeDuplicateFlags(taskList, boardTasks) {
  const existing = new Set(
    boardTasks
      .map((t) => normaliseImportTitle(t.title))
      .filter(Boolean)
  )
  return taskList.map((t) => {
    const norm = normaliseImportTitle(t.title)
    const isDuplicate = Boolean(norm) && existing.has(norm)
    return {
      ...t,
      isDuplicate,
      duplicateReason: isDuplicate
        ? 'Possible duplicate — a task with this title already exists.'
        : '',
    }
  })
}

export default function DropZoneTaskPreview({
  tasks,
  setTasks,
  boardTasks,
  destination,
  onDestinationChange,
  onClearList,
  onAddToBoard,
  onExportToThings,
}) {
  const [expandedDescIds, setExpandedDescIds] = useState(() => new Set())

  const displayTasks = useMemo(
    () => mergeDuplicateFlags(tasks, boardTasks),
    [tasks, boardTasks]
  )

  const updateById = useCallback(
    (id, patch) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    },
    [setTasks]
  )

  const allSelected =
    displayTasks.length > 0 && displayTasks.every((t) => t.selected)

  function handleSelectAllToggle() {
    const next = !allSelected
    setTasks((prev) => prev.map((t) => ({ ...t, selected: next })))
  }

  function toggleDescExpanded(id) {
    setExpandedDescIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelected(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    )
  }

  const hasSelection = displayTasks.some((t) => t.selected)
  const addToBoardEnabled =
    destination === DESTINATION_TASKLANE && hasSelection
  const exportThingsEnabled =
    destination === DESTINATION_THINGS3 && hasSelection

  function handleAddToBoardClick() {
    if (!addToBoardEnabled) return
    onAddToBoard?.()
  }

  function handleExportToThingsClick() {
    if (!exportThingsEnabled) return
    onExportToThings?.()
  }

  return (
    <section
      className="dropzone-preview-section"
      aria-labelledby="dropzone-preview-heading"
    >
      <h2 id="dropzone-preview-heading" className="sr-only">
        Parsed tasks preview
      </h2>
      <div className="dropzone-preview-header">
        <p className="board-results-summary dropzone-preview-count">
          {displayTasks.length} task{displayTasks.length === 1 ? '' : 's'} found
        </p>
        <div className="dropzone-preview-header-actions">
          <button
            type="button"
            className="btn btn-ghost btn--compact"
            onClick={handleSelectAllToggle}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn--compact dropzone-clear-list-btn"
            onClick={onClearList}
          >
            Clear List
          </button>
        </div>
      </div>

      <ul className="import-preview-list dropzone-preview-list">
        {displayTasks.map((t) => {
          const descLong = descriptionIsLong(t.description)
          const descExpanded = expandedDescIds.has(t.id)

          return (
            <li
              key={t.id}
              className={`import-preview-item${
                t.isDuplicate ? ' import-preview-item--duplicate' : ''
              }`}
            >
              <div className="import-preview-row dropzone-preview-row">
                <input
                  type="checkbox"
                  className="import-preview-checkbox"
                  checked={Boolean(t.selected)}
                  onChange={() => toggleSelected(t.id)}
                  aria-label={`Select task ${t.title || 'untitled'}`}
                />
                <div className="import-preview-main">
                  <input
                    type="text"
                    className="dropzone-preview-title-input"
                    value={t.title}
                    onChange={(e) => updateById(t.id, { title: e.target.value })}
                    aria-label="Task title"
                  />
                  <div className="import-preview-meta">
                    <button
                      type="button"
                      className={`priority-badge priority-badge--${previewPriorityVariant(
                        t.priority
                      )} dropzone-priority-badge-btn`}
                      onClick={() =>
                        updateById(t.id, {
                          priority: cyclePriority(t.priority, destination),
                        })
                      }
                    >
                      {t.priority}
                      <span className="dropzone-priority-emoji" aria-hidden>
                        {priorityEmoji(t.priority, destination)}
                      </span>
                    </button>
                    {destination === DESTINATION_TASKLANE ? (
                      <button
                        type="button"
                        className="task-type-badge dropzone-meta-badge-btn"
                        onClick={() =>
                          updateById(t.id, {
                            taskType: cycleEnum(t.taskType, TASK_TYPES),
                          })
                        }
                      >
                        {t.taskType}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="import-source-label dropzone-meta-badge-btn"
                      onClick={() =>
                        updateById(t.id, {
                          source: cycleEnum(t.source, SOURCE_OPTIONS),
                        })
                      }
                    >
                      {t.source}
                    </button>
                  </div>
                  {destination === DESTINATION_TASKLANE ? (
                    <div className="dropzone-preview-owner-row">
                      <label
                        className="dropzone-preview-sublabel"
                        htmlFor={`dz-owner-${t.id}`}
                      >
                        Owner
                      </label>
                      <input
                        id={`dz-owner-${t.id}`}
                        type="text"
                        className="task-form-input dropzone-preview-owner-input"
                        value={t.owner}
                        onChange={(e) =>
                          updateById(t.id, { owner: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </div>
                  ) : null}
                  <div className="dropzone-preview-due-row">
                    <label
                      className="dropzone-preview-sublabel"
                      htmlFor={`dz-due-${t.id}`}
                    >
                      Due date
                    </label>
                    <input
                      id={`dz-due-${t.id}`}
                      type="text"
                      className="task-form-input dropzone-preview-due-input"
                      value={t.dueDate}
                      onChange={(e) =>
                        updateById(t.id, { dueDate: e.target.value.trim() })
                      }
                      placeholder="YYYY-MM-DD"
                    />
                    {t.dueDate ? (
                      <p className="import-preview-due dropzone-preview-due-readout">
                        Due {formatDateLabel(t.dueDate)}
                      </p>
                    ) : null}
                  </div>
                  {t.isDuplicate ? (
                    <p className="import-duplicate-note">{t.duplicateReason}</p>
                  ) : null}
                  {t.description ? (
                    <div className="dropzone-preview-description-block">
                      <p
                        className={`import-preview-description${
                          descLong && !descExpanded
                            ? ' import-preview-description--clamped'
                            : ''
                        }`}
                      >
                        {t.description}
                      </p>
                      {descLong ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn--compact dropzone-desc-toggle"
                          onClick={() => toggleDescExpanded(t.id)}
                        >
                          {descExpanded ? 'Show less' : 'Show more'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="dropzone-preview-footer">
        <DestinationToggle value={destination} onChange={onDestinationChange} />
        {destination === DESTINATION_TASKLANE ? (
          <button
            type="button"
            className="btn btn-primary btn--compact"
            disabled={!addToBoardEnabled}
            onClick={handleAddToBoardClick}
          >
            Add to Board
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn--compact"
            disabled={!exportThingsEnabled}
            onClick={handleExportToThingsClick}
          >
            Export to Things 3
          </button>
        )}
      </div>
    </section>
  )
}
