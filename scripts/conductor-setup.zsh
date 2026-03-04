#!/usr/bin/env zsh

set -euo pipefail

# This setup script is intentionally narrative and explicit:
# every worktree should be able to answer "what do I need to run?"
# with one command and predictable output.

print "[conductor:setup] Preparing this workspace to run both admin and example apps."
print "[conductor:setup] This script keeps setup repeatable across every Conductor worktree."

if [[ ! -f "package.json" ]]; then
  print "[conductor:setup] Expected to run from the repository root. Aborting."
  exit 1
fi

if [[ ! -f "packages/admin/.env" ]]; then
  # Prefer a shared env from the root clone so new worktrees inherit credentials.
  if [[ -n "${CONDUCTOR_ROOT_PATH:-}" && -f "${CONDUCTOR_ROOT_PATH}/packages/admin/.env" ]]; then
    ln -snf "${CONDUCTOR_ROOT_PATH}/packages/admin/.env" "packages/admin/.env"
    print "[conductor:setup] Linked packages/admin/.env from CONDUCTOR_ROOT_PATH."
  else
    # Fall back to a local template if there is no root env to mirror.
    cp "packages/admin/.env.example" "packages/admin/.env"
    print "[conductor:setup] Created packages/admin/.env from .env.example."
    print "[conductor:setup] Fill in GitHub OAuth values before first login."
  fi
else
  print "[conductor:setup] Existing packages/admin/.env detected."
fi

print "[conductor:setup] Installing workspace dependencies..."
npm install

print "[conductor:setup] Setup complete."
print "[conductor:setup] Next step: run ./scripts/conductor-run.zsh"
