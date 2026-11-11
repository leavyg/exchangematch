#!/usr/bin/env bash
# Rebuild the public site from the app page + data, then push it to the hosting repo.
# Usage: build/publish.sh <repo-dir> <site-url> ["commit message"]
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$1"; URL="$2"; MSG="${3:-Update ExchangeMatch}"
python3 -I build/make_site.py exchangematch.html data.json "$REPO" "$URL"
rm -rf "$REPO/fonts"; python3 -I build/fonts.py build/fontpkgs "$REPO"
cp README.md "$REPO/README.md" 2>/dev/null || true
cd "$REPO" && git add -A && (git diff --cached --quiet && echo "No changes to publish." || (git commit -q -m "$MSG" && git push -q && echo "Pushed: $MSG"))
