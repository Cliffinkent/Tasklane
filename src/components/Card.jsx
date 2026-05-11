import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'
import { normaliseTaskType, DEFAULT_TASK_TYPE } from '../data/taskMetadata'
import { formatDateLabel } from '../utils/formatDateLabel'

function priorityVariant(priority) {
  switch (priority) {
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

/** Safe BEM suffix for `card--priority-*` from task.priority */
function priorityCardClass(priority) {
  const raw = String(priority ?? 'Medium')
    .trim()
    .toLowerCase()
  const allowed = new Set(['low', 'medium', 'high', 'critical'])
  const key = allowed.has(raw) ? raw : 'medium'
  return `card--priority-${key}`
}

function dueDisplay(isoDate) {
  const formatted = formatDateLabel(isoDate)
  return formatted || null
}

function isInteractiveElement(target, cardRoot) {
  const interactive = target?.closest?.(
    'button, a, input, select, textarea, label, .card-move-backdrop, .card-move-menu'
  )

  if (interactive) return true

  const roleButton = target?.closest?.('[role="button"]')

  if (!roleButton) return false

  if (roleButton === cardRoot) return false

  return true
}

function CardContent({ task, epics = [], onMove, onEdit, onDelete, isOverlay = false }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const otherColumns = COLUMNS.filter((c) => c.id !== task.columnId)
  const epic = task.epicId ? epics.find((e) => e.id === task.epicId) : null

  const taskTypeLabel = normaliseTaskType(
    task.taskType ?? '',
    DEFAULT_TASK_TYPE
  )
  const priorityLabel = task.priority || 'Medium'
  const dueStr = dueDisplay(task.dueDate)
  const ownerStr = typeof task.owner === 'string' && task.owner.trim() ? task.owner.trim() : null
  const commentCount = Array.isArray(task.comments) ? task.comments.length : 0
  const priorityClass = priorityCardClass(task.priority)

  return (
    <div
      className={`card ${priorityClass} ${isOverlay ? 'card--overlay' : 'card--interactive'}`}
    >
      <div className="card-toolbar">
        <div className="card-badges">
          <span className="task-type-badge">{taskTypeLabel}</span>
          <span
            className={`priority-badge priority-badge--${priorityVariant(priorityLabel)}`}
          >
            {priorityLabel}
          </span>
          {epic ? (
            <span className="epic-badge">{epic.name}</span>
          ) : task.epicId ? (
            <span className="epic-badge epic-badge--unknown">Unknown epic</span>
          ) : null}
        </div>
        {!isOverlay && (
          <div className="card-actions">
            {otherColumns.length > 0 && (
              <div className="card-move">
                <button
                  type="button"
                  className="card-move-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMoveMenu((v) => !v)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Move task"
                >
                  Move
                </button>
                {showMoveMenu && (
                  <>
                    <div
                      className="card-move-backdrop"
                      onClick={() => setShowMoveMenu(false)}
                      aria-hidden
                    />
                    <div className="card-move-menu">
                      {otherColumns.map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          className="card-move-item"
                          onClick={() => {
                            onMove(task.id, col.id)
                            setShowMoveMenu(false)
                          }}
                        >
                          → {col.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              className="card-edit-btn"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Edit task"
            >
              Edit
            </button>
            <button
              type="button"
              className="card-delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                onDelete?.(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Delete task"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <h3 className="card-title">{task.title}</h3>

      {task.description ? (
        <p className="card-description">{task.description}</p>
      ) : null}

      {dueStr || ownerStr || commentCount > 0 ? (
        <footer className="card-footer">
          {ownerStr ? (
            <span className="card-footer-item" title={ownerStr}>
              <span className="card-footer-label">Owner</span>
              <span className="card-footer-value">{ownerStr}</span>
            </span>
          ) : null}
          {dueStr ? (
            <span className="card-footer-item card-footer-item--due">
              <span className="card-footer-label">Due</span>
              <span className="card-footer-value">{dueStr}</span>
            </span>
          ) : null}
          {commentCount > 0 ? (
            <button
              type="button"
              className="card-comment-count"
              onClick={(e) => {
                e.stopPropagation()
                onEdit?.(task.id)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={`Open comments for ${task.title}`}
            >
              💬 {commentCount}
            </button>
          ) : null}
        </footer>
      ) : null}
    </div>
  )
}

export default function Card({ task, epics, onMove, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { type: 'task', task, columnId: task.columnId },
  })

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${task.id}`,
    data: { type: 'task', taskId: task.id, task, columnId: task.columnId },
  })

  function setRefs(node) {
    setDragRef(node)
    setDropRef(node)
  }

  function handleCardMouseDownCapture(event) {
    if (event.detail !== 2) return
    if (isDragging) return
    if (isInteractiveElement(event.target, event.currentTarget)) return
    event.preventDefault()
    event.stopPropagation()
    onEdit?.(task.id)
  }

  return (
    <div
      ref={setRefs}
      className={`card-wrapper ${isDragging ? 'card-wrapper--dragging' : ''} ${isOver && !isDragging ? 'card-wrapper--drop-target' : ''}`}
      {...attributes}
      {...listeners}
      title="Double-click to edit"
      onMouseDownCapture={handleCardMouseDownCapture}
    >
      <CardContent
        task={task}
        epics={epics}
        onMove={onMove}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}

export { CardContent }
