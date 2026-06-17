#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${PAFA_EXAM_APP:=file://${ROOT}/exam.html?debug=7958}"
: "${PAFA_INSPECT_RUN:=/Users/justin/Downloads/0617 3 4 동형json/_INSPECT_RUN_20260617_current_20260617_010031}"

export PAFA_EXAM_APP
export PAFA_INSPECT_RUN

# pafa-exam is a static Vercel app and intentionally has no package.json.
# Reuse the existing pafa-league3 Playwright install when present, to avoid changing Vercel build behavior.
if [ -d "/Users/justin/dev/pafa-league3/node_modules" ]; then
  export NODE_PATH="/Users/justin/dev/pafa-league3/node_modules${NODE_PATH:+:$NODE_PATH}"
  /Users/justin/dev/pafa-league3/node_modules/.bin/playwright test tests/multi-select.spec.js --reporter=list
else
  npx --yes @playwright/test test tests/multi-select.spec.js --reporter=list
fi
