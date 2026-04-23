import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { COLUMNS } from '../data/columns'
import Column from './Column'
import TaskForm from './TaskForm'
import Card, { CardContent } from './Card'

export default function Board({ tasks, onCreateTask, onMoveTask, onUpdateTask }) {
  const [showForm, setShowForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [activeId, setActiveId] = useState(null)

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
      onMoveTask(active.id, over.id)
    }
  }

  return (
    <div className="board">
      <div className="board-toolbar">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          Add task
        </button>
      </div>
      {showForm && (
        <div className="board-form-overlay">
          <div className="board-form-panel">
            <TaskForm
              onSubmit={(data) => {
                onCreateTask(data)
                setShowForm(false)
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
      {editingTaskId && (
        <div className="board-form-overlay">
          <div className="board-form-panel">
            <TaskForm
              initialTask={tasks.find((t) => t.id === editingTaskId)}
              onSubmit={(data) => {
                onUpdateTask(editingTaskId, data)
                setEditingTaskId(null)
              }}
              onCancel={() => setEditingTaskId(null)}
            />
          </div>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="board-columns">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              columnId={column.id}
              title={column.title}
              tasks={tasks.filter((t) => t.columnId === column.id)}
              onMoveTask={onMoveTask}
              onEditTask={setEditingTaskId}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? (
            <div className="card-overlay-wrapper">
              <CardContent task={activeTask} onMove={() => {}} onEdit={null} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
