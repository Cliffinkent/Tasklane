#!/usr/bin/env bash
# Restore Tasklane board data from a legacy Electron profile folder (macOS).
set -euo pipefail

APP_SUPPORT="${HOME}/Library/Application Support"
STABLE="${APP_SUPPORT}/com.tasklane.app"

if [[ -d "${STABLE}/data" ]] && [[ -f "${STABLE}/data/kanban-tasks.json" ]]; then
  echo "Stable profile already has kanban-tasks.json — no copy needed."
  exit 0
fi

for legacy in task-manager Taskdrop Tasklane; do
  src="${APP_SUPPORT}/${legacy}"
  if [[ ! -d "${src}/Local Storage" ]]; then
    continue
  fi
  echo "Restoring profile from ${legacy} → com.tasklane.app"
  mkdir -p "${STABLE}"
  cp -R "${src}/." "${STABLE}/"
  echo "Done. Quit Tasklane, reopen the app (or reinstall DMG after npm run dist)."
  exit 0
done

echo "No legacy profile with Local Storage found under:"
echo "  ${APP_SUPPORT}/task-manager"
echo "  ${APP_SUPPORT}/Taskdrop"
echo "  ${APP_SUPPORT}/Tasklane"
exit 1
