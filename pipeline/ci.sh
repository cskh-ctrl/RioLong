#!/usr/bin/env bash
# CI entry: install everything, then render one video. All output goes to the log.
set -euxo pipefail
KIND=$1; N=$2
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
nproc; free -g; df -h . | tail -1
which ffmpeg || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)
ffmpeg -version | head -1
if [ ! -s models/kokoro-v1.0.onnx ]; then
  mkdir -p models
  for f in kokoro-v1.0.onnx voices-v1.0.bin; do curl -fsSL --retry 3 -o models/$f https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/$f; done
fi
ls -la models
python3 -m pip install -q --break-system-packages kokoro-onnx soundfile numpy scipy
(cd studio && npm install --no-audit --no-fund && npx playwright install --with-deps chromium)
set +x
WORKERS=${WORKERS:-4} bash pipeline/run_one.sh "$KIND" "$N"
