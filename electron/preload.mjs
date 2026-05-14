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
  console.error('[Tasklane preload] contextBridge.exposeInMainWorld failed', e)
}
