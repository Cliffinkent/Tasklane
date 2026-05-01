import { useDroppable } from '@dnd-kit/core'
import Card from './Card'

export default function Column({
  columnId,
  title,
  tasks,
  epics,
  onMoveTask,
  onEditTask,
  onDeleteTask,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })

  return (
    <div className={`column ${isOver ? 'column--over' : ''}`}>
      <h2 className="column-title">{title}</h2>
      <div ref={setNodeRef} className="column-cards">
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            epics={epics}
            onMove={onMoveTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  )
}
