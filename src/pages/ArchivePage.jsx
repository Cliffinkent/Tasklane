import { useMemo } from 'react'
import { COLUMNS } from '../data/columns'
import { formatDateLabel } from '../utils/formatDateLabel'

const columnTitleById = new Map(COLUMNS.map((c) => [c.id, c.title]))

function columnLabel(columnId) {
  if (columnId == null || columnId === '') return 'No lane'
  return columnTitleById.get(columnId) || String(columnId)
}

function sortTimestamp(task) {
  const updated = Date.parse(task.updatedAt)
  if (Number.isFinite(updated)) return updated
  const created = Date.parse(task.createdAt)
  if (Number.isFinite(created)) return created
  return 0
}

function sortArchivedTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const timeDiff = sortTimestamp(b) - sortTimestamp(a)
    if (timeDiff !== 0) return timeDiff
    return String(a.id).localeCompare(String(b.id))
  })
}

function taskA11yLabel(task) {
  const title = String(task.title ?? '').trim()
  return title || 'task'
}

export default function ArchivePage({
  tasks = [],
  epics = [],
  onRestoreTask,
  onDeleteTask,
}) {
  const sortedTasks = useMemo(() => sortArchivedTasks(tasks), [tasks])

  return (
    <div className="archive-page">
      <section aria-labelledby="archive-tasks-heading">
        <h2 id="archive-tasks-heading" className="page-section-heading">
          Archived tasks
          {sortedTasks.length > 0 ? (
            <span className="archive-task-count"> ({sortedTasks.length})</span>
          ) : null}
        </h2>
        {sortedTasks.length === 0 ? (
          <div className="empty-state archive-empty-state" role="status">
            <div className="empty-state-inner">
              <h3 className="archive-empty-title">No archived tasks</h3>
              <div className="empty-state-panel">
                <p className="empty-state-message">
                  Archived tasks will appear here.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ul className="archive-task-list">
            {sortedTasks.map((task) => {
              const epic = task.epicId
                ? epics.find((e) => e.id === task.epicId)
                : null
              const dueRaw =
                typeof task.dueDate === 'string' && task.dueDate.trim()
                  ? task.dueDate.trim()
                  : ''
              const dueStr = dueRaw ? formatDateLabel(dueRaw) : null
              const label = taskA11yLabel(task)
              return (
                <li key={task.id} className="archive-task-item">
                  <div className="archive-task-body">
                    <p className="archive-task-title">
                      {task.title?.trim() ? task.title : 'Untitled task'}
                    </p>
                    {task.description ? (
                      <p className="archive-task-description">{task.description}</p>
                    ) : null}
                    <div className="archive-task-meta">
                      <span className="archive-task-meta-item">
                        <span className="archive-task-meta-label">Lane</span>{' '}
                        {columnLabel(task.columnId)}
                      </span>
                      {task.epicId ? (
                        <span className="archive-task-meta-item">
                          <span className="archive-task-meta-label">Epic</span>{' '}
                          {epic ? (
                            <span className="epic-badge">{epic.name}</span>
                          ) : (
                            <span className="epic-badge epic-badge--unknown">
                              Epic unavailable
                            </span>
                          )}
                        </span>
                      ) : null}
                      {dueStr ? (
                        <span className="archive-task-meta-item archive-task-meta-item--due">
                          <span className="archive-task-meta-label">Due</span>{' '}
                          {dueStr}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="archive-task-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onRestoreTask(task.id)}
                      aria-label={`Restore ${label}`}
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn--danger-quiet"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={`Delete ${label}`}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
