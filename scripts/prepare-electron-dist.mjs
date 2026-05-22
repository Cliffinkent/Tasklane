/**
 * Repair broken electron vendor symlinks, then ensure no node_modules/electron symlink
 * remains before electron-builder (avoids ELOOP during @electron/rebuild).
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

execSync('node scripts/repair-electron-vendor.mjs', { cwd: root, stdio: 'inherit' })

const electronPath = path.join(root, 'node_modules', 'electron')
try {
  if (fs.lstatSync(electronPath).isSymbolicLink()) {
    fs.unlinkSync(electronPath)
    console.log('[prepare-electron-dist] removed node_modules/electron symlink')
  }
} catch (err) {
  if (err?.code !== 'ENOENT') throw err
}
