import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'

function CardContent({ task, onMove, onEdit, isOverlay = false }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const otherColumns = COLUMNS.filter((c) => c.id !== task.columnId)

  return (
    <div className={`card ${isOverlay ? 'card--overlay' : ''}`}>
      <div className="card-header">
        <h3 className="card-title">{task.title}</h3>
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
          </div>
        )}
      </div>
      {task.description && (
        <p className="card-description">{task.description}</p>
      )}
    </div>
  )
}

export default function Card({ task, onMove, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: { task, columnId: task.columnId },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card-wrapper ${isDragging ? 'card-wrapper--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <CardContent task={task} onMove={onMove} onEdit={onEdit} />
    </div>
  )
}

export { CardContent }
