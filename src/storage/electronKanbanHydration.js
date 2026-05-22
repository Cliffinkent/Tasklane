/** Single-flight load of kanban data from Electron profile files (see electron/kanbanStorage.mjs). */

let hydratePromise = null

export function isElectronKanbanStore() {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.loadKanbanStore)
}

export function loadElectronKanbanOnce() {
  if (!isElectronKanbanStore()) return Promise.resolve(null)
  if (!hydratePromise) {
    hydratePromise = window.electronAPI.loadKanbanStore().catch(() => null)
  }
  return hydratePromise
}

export function saveElectronKanbanTasks(tasks) {
  window.electronAPI?.saveKanbanTasks?.(tasks)
}

export function saveElectronKanbanEpics(epics) {
  window.electronAPI?.saveKanbanEpics?.(epics)
}
