import { useDroppable } from '@dnd-kit/core'
import Card from './Card'

const COLUMN_CLASS = {
  backlog: 'column--backlog',
  'in-progress': 'column--in-progress',
  blocked: 'column--blocked',
  done: 'column--done',
}

const EMPTY_WHEN_CLEAR = {
  backlog: 'No backlog tasks yet.',
  'in-progress': 'Nothing in progress yet.',
  blocked: 'No blockers.',
  done: 'No completed tasks yet.',
}

export default function Column({
  columnId,
  title,
  tasks,
  totalInColumn,
  filtersActive,
  epics,
  onRepositionTask,
  onEditTask,
  onDeleteTask,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: 'column',
      columnId,
    },
  })

  const isEmpty = tasks.length === 0
  const variantClass = COLUMN_CLASS[columnId] || ''

  const emptyMessage = isEmpty
    ? filtersActive
      ? 'No tasks match these filters.'
      : EMPTY_WHEN_CLEAR[columnId] || 'No tasks yet.'
    : null

  const showEmptyState = Boolean(emptyMessage) && isEmpty

  return (
    <div
      ref={setNodeRef}
      className={`column ${variantClass} ${isOver ? 'column--over' : ''}`.trim()}
    >
      <header className="column-header">
        <div className="column-header-main">
          <span className="column-accent-dot" aria-hidden />
          <h2 className="column-title">{title}</h2>
        </div>
        <span
          className="column-count"
          aria-label={
            filtersActive && totalInColumn !== tasks.length
              ? `${tasks.length} of ${totalInColumn} tasks in this column match filters`
              : `${tasks.length} tasks in this column`
          }
        >
          {tasks.length}
        </span>
      </header>
      <div className={`column-cards ${showEmptyState ? 'column-cards--empty' : ''}`}>
        {showEmptyState ? (
          <div className="column-empty" role="status">
            <div className="column-empty-panel">
              <p className="column-empty-message">{emptyMessage}</p>
            </div>
          </div>
        ) : null}
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            epics={epics}
            onMove={onRepositionTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  )
}
