#!/usr/bin/env bash
# Tai toan bo video Rio Animation ve may (macOS/Linux): bash tai_ve_mac.sh
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)/RioAnimation"
for t in g01 g02 g03 g04 g05 g06; do
  J=$(curl -fsSL "https://api.github.com/repos/cskh-ctrl/RioLong/releases/tags/$t")
  NAME=$(echo "$J" | python3 -c "import sys,json;print(json.load(sys.stdin)['name'])")
  mkdir -p "$ROOT/$NAME"
  echo "$J" | python3 -c "import sys,json;[print(a['name'],a['browser_download_url']) for a in sorted(json.load(sys.stdin)['assets'],key=lambda a:a['name'])]" | while read n u; do
    [ -d "$ROOT/$NAME/${n%.zip}" ] && { echo "Da co: $n"; continue; }
    echo "Dang tai $NAME / $n ..."; curl -fL -o "$ROOT/$NAME/$n" "$u"; (cd "$ROOT/$NAME" && unzip -q -o "$n" && rm "$n")
  done
done
echo "Xong! Thu muc: $ROOT"
