#!/usr/bin/env bash
# Regenerate the Linux Playwright snapshots inside a container that matches CI
# (Ubuntu + the pinned @playwright/test version), then copy the *-linux.png
# baselines back into the repo. Run this after an intended visual change so the
# visual-regression check passes on CI — macOS-generated *-darwin.png snapshots
# don't match the Linux runner's text rendering.
#
# Any extra args pass through to `playwright test`, e.g.
#   .github/scripts/update-linux-snapshots.sh --grep why-dragon
#
# Requires Docker.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
pw_version="$(node -p "require('${repo_root}/package.json').devDependencies['@playwright/test'].replace(/[^0-9.]/g, '')")"
image="mcr.microsoft.com/playwright:v${pw_version}-noble"
passthrough="$*"

echo "Updating Linux snapshots in ${image}"

# Copy the repo into the container (skip node_modules/.git/dist so the host's
# macOS install and git dir stay untouched), install fresh Linux deps, build,
# update snapshots, then copy only the *-linux.png files back.
docker run --rm -v "${repo_root}":/src "${image}" bash -lc "
  set -e
  mkdir -p /work
  tar -C /src --exclude=./node_modules --exclude=./dist --exclude=./.git -cf - . | tar -C /work -xf -
  cd /work
  npm i -g bun >/dev/null 2>&1
  bun install --frozen-lockfile
  bun run build
  CI=true bunx playwright test ${passthrough} --update-snapshots
  cp -v /work/e2e/visual-regression.spec.ts-snapshots/*-linux.png /src/e2e/visual-regression.spec.ts-snapshots/
"
