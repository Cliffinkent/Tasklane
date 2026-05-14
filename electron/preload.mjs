import { contextBridge, ipcRenderer } from 'electron'

console.log('[Tasklane preload] loaded')

/** Buffer imports until React registers — avoids losing IPC sent before useEffect runs. */
const pendingPayloads = []
let subscriber = null

function notifyHandled(payload) {
  try {
    ipcRenderer.send('taskdrop-import-handled', payload)
  } catch (e) {
    console.error('[Tasklane preload] notifyImportHandled failed', e)
  }
}

function deliverToSubscriber(payload) {
  if (!subscriber) {
    pendingPayloads.push(payload)
    return
  }
  try {
    subscriber(payload)
  } catch (e) {
    console.error('[Tasklane preload] import subscriber error', e)
    notifyHandled({
      filePath: typeof payload?.filePath === 'string' ? payload.filePath : '',
      success: false,
    })
  }
}

ipcRenderer.on('taskdrop-pending-import', (_event, payload) => {
  deliverToSubscriber(payload)
})

try {
  contextBridge.exposeInMainWorld('tasklaneImportBridge', {
    onPendingImport: (cb) => {
      subscriber = cb
      while (pendingPayloads.length) {
        deliverToSubscriber(pendingPayloads.shift())
      }
      return () => {
        subscriber = null
      }
    },
    notifyImportHandled: (payload) => notifyHandled(payload),
  })
} catch (e) {
  console.error('[Tasklane preload] contextBridge tasklaneImportBridge failed', e)
}

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
    setClipboardWatcherEnabled: (enabled) => {
      ipcRenderer.send('clipboard:set-watcher-enabled', Boolean(enabled))
    },
    openExternalURL: (url) => ipcRenderer.invoke('shell:open-external', url),
  })
} catch (e) {
  console.error('[Tasklane preload] contextBridge electronAPI failed', e)
}
