#!/usr/bin/env bash
#
# Publish workshop material from `dev` to the participant branch `main`.
#
#   scripts/publish.sh 02              # release the exercise (start of session)
#   scripts/publish.sh 02 --reveal     # release guide.md + solution (after session)
#   scripts/publish.sh 02 --push       # ... and push to origin
#
# `main` has its own history and only ever contains released material.
# Nothing is pushed unless you pass --push.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

EX="${1:-}"
if ! [[ "$EX" =~ ^[0-9]{2}$ ]]; then
  echo "usage: scripts/publish.sh NN [--reveal] [--push]   (NN = 01..12)" >&2
  exit 1
fi
shift

REVEAL=false
PUSH=false
for arg in "$@"; do
  case "$arg" in
    --reveal) REVEAL=true ;;
    --push)   PUSH=true ;;
    *) echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

SRC=dev
WT=".publish-main"

DIR=$(git ls-tree -d --name-only "$SRC" exercises/ | grep "^exercises/${EX}-" || true)
if [ -z "$DIR" ]; then
  echo "no exercise directory for '${EX}' on ${SRC}" >&2
  exit 1
fi

# Files to copy, as paths in the $SRC tree.
files=()
if $REVEAL; then
  files+=("$DIR/guide.md" "$DIR/solution.tsx" "src/wrappers/${EX}-solution.tsx")
  MSG="Exercise ${EX}: guide + solution"
else
  # everything in the exercise dir except the solution and the guide
  # (e.g. exercise.tsx, and api.ts for exercise 04)
  while IFS= read -r f; do
    case "$(basename "$f")" in
      solution.tsx|guide.md) ;;
      *) files+=("$f") ;;
    esac
  done < <(git ls-tree -r --name-only "$SRC" "$DIR/")
  files+=("src/wrappers/${EX}.tsx")
  # exercise name from the curriculum table in the README
  TITLE=$(git show "${SRC}:README.md" | awk -F'|' -v ex="$EX" '
    $2 ~ "^ *"ex" *$" { gsub(/^ +| +$/, "", $3); print $3; exit }')
  MSG="Exercise ${EX}${TITLE:+: $TITLE}"
fi

for f in "${files[@]}"; do
  git cat-file -e "${SRC}:${f}" 2>/dev/null || { echo "missing on ${SRC}: $f" >&2; exit 1; }
done

# App.tsx / scaffolding fixes made on dev should reach participants too.
files+=("src/App.tsx" "src/main.tsx" "index.html" "package.json" "package-lock.json")

git worktree add -f "$WT" main >/dev/null
trap 'git worktree remove --force "$WT" >/dev/null 2>&1 || true' EXIT

for f in "${files[@]}"; do
  mkdir -p "$WT/$(dirname "$f")"
  git show "${SRC}:${f}" > "$WT/$f"
done

if [ -z "$(git -C "$WT" status --porcelain)" ]; then
  echo "nothing to publish — main already has this."
  exit 0
fi

git -C "$WT" add -A
git -C "$WT" status --short
git -C "$WT" commit -q -m "$MSG"
echo
echo "committed on main: $MSG"

if $PUSH; then
  git -C "$WT" push origin main
else
  echo "review with:  git log -p main -1"
  echo "then push:    git push origin main"
fi
