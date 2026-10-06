#!/usr/bin/env bash
# Package theme/modafie → modafie-theme.zip (installable via Appearance → Themes → Upload).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/modafie-theme.zip"
rm -f "$OUT"
cd "$ROOT/theme"
find modafie -name '.DS_Store' -delete
zip -r -q -X "$OUT" modafie -x 'modafie/.git*' 'modafie/node_modules/*'
echo "Wrote $OUT ($(du -h "$OUT" | cut -f1))"
