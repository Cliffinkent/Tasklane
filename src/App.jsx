import { useLocalStorage } from './hooks/useLocalStorage'
import { useTheme } from './hooks/useTheme'
import Board from './components/Board'
import './App.css'

function App() {
  const [tasks, setTasks] = useLocalStorage()
  const [theme, toggleTheme] = useTheme()

  function handleCreate({ title, description }) {
    const task = {
      id: crypto.randomUUID(),
      title: title.trim() || 'Untitled',
      description: (description || '').trim(),
      columnId: 'backlog',
    }
    setTasks((prev) => [...prev, task])
  }

  function handleMove(taskId, newColumnId) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, columnId: newColumnId } : t))
    )
  }

  function handleUpdate(taskId, { title, description }) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              title: (title ?? t.title).trim() || 'Untitled',
              description: (description ?? t.description ?? '').trim(),
            }
          : t
      )
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Kanban Task Board</h1>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? (
            <span className="theme-toggle-icon" aria-hidden>🌙</span>
          ) : (
            <span className="theme-toggle-icon" aria-hidden>☀️</span>
          )}
          <span className="theme-toggle-label">{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </header>
      <Board
        tasks={tasks}
        onCreateTask={handleCreate}
        onMoveTask={handleMove}
        onUpdateTask={handleUpdate}
      />
    </div>
  )
}

export default App
