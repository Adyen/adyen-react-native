#!/bin/bash

set -euo pipefail

PORT=${1:-4723}
TIMEOUT=${2:-90}
PID_FILE=${APPIUM_PID_FILE:-.appium.pid}

echo "== Starting Appium on port $PORT"
appium --port "$PORT" --log-level error &
APPIUM_PID=$!
printf '%s\n' "$APPIUM_PID" > "$PID_FILE"

for i in $(seq 1 "$TIMEOUT"); do
  if curl -sf "http://127.0.0.1:$PORT/status" >/dev/null 2>&1; then
    echo "== Appium started successfully"
    exit 0
  fi
  sleep 1
done

echo "Error: Appium failed to start within ${TIMEOUT} seconds"
kill "$APPIUM_PID" 2>/dev/null || true
rm -f "$PID_FILE"
exit 1
