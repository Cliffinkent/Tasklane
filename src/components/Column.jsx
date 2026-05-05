import { useDroppable } from '@dnd-kit/core'
import Card from './Card'

export default function Column({
  columnId,
  title,
  tasks,
  totalInColumn,
  filterActive,
  epics,
  onRepositionTask,
  onEditTask,
  onDeleteTask,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  const isEmpty = tasks.length === 0
  const emptyMessage =
    totalInColumn === 0
      ? 'No tasks'
      : filterActive && tasks.length === 0
        ? 'No matching tasks'
        : null

  const showEmptyState = Boolean(emptyMessage) && isEmpty

  return (
    <div className={`column ${isOver ? 'column--over' : ''}`}>
      <h2 className="column-title">{title}</h2>
      <div
        ref={setNodeRef}
        className={`column-cards ${showEmptyState ? 'column-cards--empty' : ''}`}
      >
        {showEmptyState ? (
          <div className="column-empty" role="status">
            <span className="column-empty-message">{emptyMessage}</span>
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
