import { contextBridge, ipcRenderer } from 'electron'

console.log('[Tasklane preload] loaded')

/** Clipboard Copilot JSON detection (main process polls; renderer shows toast). */
const pendingClipboardTexts = []
let clipboardSubscriber = null

function deliverClipboardText(text) {
  const raw = typeof text === 'string' ? text : ''
  if (!clipboardSubscriber) {
    pendingClipboardTexts.push(raw)
    return
  }
  try {
    clipboardSubscriber(raw)
  } catch (e) {
    console.error('[Tasklane preload] clipboard subscriber error', e)
  }
}

ipcRenderer.on('clipboard:tasks-detected', (_event, text) => {
  deliverClipboardText(text)
})

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    onTasksDetected: (cb) => {
      clipboardSubscriber = cb
      while (pendingClipboardTexts.length) {
        const next = pendingClipboardTexts.shift()
        try {
          clipboardSubscriber(next)
        } catch (e) {
          console.error('[Tasklane preload] clipboard flush error', e)
        }
      }
      return () => {
        clipboardSubscriber = null
      }
    },
    acknowledgeTasksDetected: () => {
      ipcRenderer.send('clipboard:tasks-acknowledged')
    },
    dismissTasksDetected: () => {
      ipcRenderer.send('clipboard:tasks-dismissed')
    },
    getClipboardWatcherEnabled: () =>
      ipcRenderer.invoke('clipboard:get-watcher-enabled'),
    setClipboardWatcherEnabled: (enabled) => {
      ipcRenderer.send('clipboard:set-watcher-enabled', Boolean(enabled))
    },
    openExternalURL: (url) => ipcRenderer.invoke('shell:open-external', url),
    loadKanbanStore: () => ipcRenderer.invoke('kanban:load-store'),
    saveKanbanTasks: (tasks) => ipcRenderer.invoke('kanban:save-tasks', tasks),
    saveKanbanEpics: (epics) => ipcRenderer.invoke('kanban:save-epics', epics),
  })
} catch (e) {
  console.error('[Tasklane preload] contextBridge electronAPI failed', e)
}
