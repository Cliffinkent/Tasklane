/**
 * Fix a broken node_modules/.electron-vendor self-symlink (ELOOP) and restore the real package.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const vendor = path.join(root, 'node_modules', '.electron-vendor')
const electronLink = path.join(root, 'node_modules', 'electron')

function isSelfSymlink(p) {
  try {
    if (!fs.lstatSync(p).isSymbolicLink()) return false
    const target = fs.readlinkSync(p)
    const resolved = path.resolve(path.dirname(p), target)
    return resolved === path.resolve(p)
  } catch {
    return false
  }
}

let repaired = false

if (isSelfSymlink(vendor)) {
  fs.unlinkSync(vendor)
  repaired = true
  console.log('[repair-electron-vendor] removed broken .electron-vendor self-symlink')
}

try {
  if (fs.lstatSync(electronLink).isSymbolicLink()) {
    fs.unlinkSync(electronLink)
    repaired = true
  }
} catch (err) {
  if (err?.code !== 'ENOENT') throw err
}

if (repaired || !fs.existsSync(vendor)) {
  console.log('[repair-electron-vendor] reinstalling electron package…')
  execSync('npm install electron@33.4.11 --no-save', {
    cwd: root,
    stdio: 'inherit',
  })
  execSync('node scripts/relocate-electron-install.js', {
    cwd: root,
    stdio: 'inherit',
  })
}
