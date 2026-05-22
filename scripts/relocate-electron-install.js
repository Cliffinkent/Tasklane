/**
 * npm's `electron` package at `node_modules/electron` exports only the binary path
 * and shadows Electron's built-in `electron` binding. Relocate so `import 'electron'` works.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const canonical = path.join(root, 'node_modules', 'electron')
const vendor = path.join(root, 'node_modules', '.electron-vendor')

if (fs.existsSync(canonical)) {
  if (fs.existsSync(vendor)) {
    fs.rmSync(vendor, { recursive: true, force: true })
  }
  fs.renameSync(canonical, vendor)
}
