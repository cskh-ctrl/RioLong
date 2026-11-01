#!/usr/bin/env bash
# Render one video end to end: voice -> shots -> frames -> sound -> delivery folder (dist/<NN_Title>.zip)
#   bash pipeline/run_one.sh long 1
set -euo pipefail
KIND=$1; N=$2; WORKERS=${WORKERS:-4}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
P="projects/${KIND}_$(printf %02d "$N")"
cd "$ROOT"
python3 pipeline/build.py --kind "$KIND" --n "$N"
cd studio
# thumbnail still: middle of the title shot (long) or 1.6 s into the hook (short)
TT=$(python3 -c "
import json;s=json.load(open('$P/story/shots.json'))['shots']
t=[x for x in s if x['params']['tpl']=='title']
print(round((t[0]['start']+t[0]['end'])/2,2) if t else 1.6)")
node render.mjs --project "$P" --stills "$TT" --format jpeg
cp "$(ls "$P"/build/stills/*.jpeg | head -1)" "$P/build/thumb.jpg"
node render.mjs --project "$P" --format jpeg --workers "$WORKERS" --crf 20 ${SCALE:+--scale $SCALE}
python3 audio/mix.py --project "$P" --out "$P/out/final.mp4"
cd "$ROOT"
python3 pipeline/package.py --kind "$KIND" --n "$N" --dest dist
