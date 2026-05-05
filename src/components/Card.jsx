import { useState } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'

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

function formatDueHint(isoDate) {
  if (!isoDate || typeof isoDate !== 'string' || !isoDate.trim()) return null
  return isoDate
}

function CardContent({ task, epics = [], onMove, onEdit, onDelete, isOverlay = false }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const otherColumns = COLUMNS.filter((c) => c.id !== task.columnId)
  const epic = task.epicId ? epics.find((e) => e.id === task.epicId) : null

  const taskTypeLabel = task.taskType || 'Discovery'
  const priorityLabel = task.priority || 'Medium'
  const dueStr = formatDueHint(task.dueDate)
  const ownerStr = typeof task.owner === 'string' && task.owner.trim() ? task.owner.trim() : null

  return (
    <div
      className={`card ${isOverlay ? 'card--overlay' : 'card--interactive'}`}
    >
      <div className="card-header">
        <div className="card-title-block">
          <div className="card-badges">
            <span className="task-type-badge">{taskTypeLabel}</span>
            <span
              className={`priority-badge priority-badge--${priorityVariant(priorityLabel)}`}
            >
              {priorityLabel}
            </span>
          </div>
          <h3 className="card-title">{task.title}</h3>
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
      {task.description && (
        <p className="card-description">{task.description}</p>
      )}
      {dueStr || ownerStr ? (
        <div className="card-meta">
          {dueStr ? (
            <span className="card-meta-item card-meta-item--due">
              <span className="card-meta-label">Due</span> {dueStr}
            </span>
          ) : null}
          {ownerStr ? (
            <span className="card-meta-item card-meta-item--owner">
              <span className="card-meta-label">Owner</span> {ownerStr}
            </span>
          ) : null}
        </div>
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
    data: { type: 'task', task, columnId: task.columnId },
  })

  function setRefs(node) {
    setDragRef(node)
    setDropRef(node)
  }

  return (
    <div
      ref={setRefs}
      className={`card-wrapper ${isDragging ? 'card-wrapper--dragging' : ''} ${isOver && !isDragging ? 'card-wrapper--drop-target' : ''}`}
      {...attributes}
      {...listeners}
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
