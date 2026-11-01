#!/usr/bin/env bash
# Checks, commits and pushes the current branch in one step.
# Usage: scripts/ship.sh "type(scope): summary" ["longer body"] [--no-push]
# Refuses to run on main, and stops before committing if any check fails.
set -euo pipefail
cd "$(dirname "$0")/.."

subject="${1:-}"
body="${2:-}"
push=1
for arg in "$@"; do [ "$arg" = "--no-push" ] && push=0; done
[ "$body" = "--no-push" ] && body=""
if [ -z "$subject" ] || [ "$subject" = "--no-push" ]; then
  echo 'usage: scripts/ship.sh "type(scope): summary" ["body"] [--no-push]' >&2
  exit 2
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  echo "ship: on $branch; create a branch first (git switch -c feat/...)" >&2
  exit 1
fi

echo "== checks"
npm run -s rules:guard
npm run -s typecheck
npm test --silent
npm run -s audit:rules

echo "== commit"
git add -A
if git diff --cached --quiet; then
  echo "nothing to commit"
else
  if [ -n "$body" ]; then git commit -q -m "$subject" -m "$body"; else git commit -q -m "$subject"; fi
  git log --oneline -1
fi

if [ "$push" = 1 ]; then
  echo "== push $branch"
  git push -u origin "$branch"
fi
