#!/bin/bash

set -euo pipefail

PORT=${1:-4723}
TIMEOUT=${2:-90}

echo "== Starting Appium on port $PORT"
appium --port "$PORT" --log-level error &

for i in $(seq 1 "$TIMEOUT"); do
  if curl -sf "http://127.0.0.1:$PORT/status" >/dev/null 2>&1; then
    echo "== Appium started successfully"
    exit 0
  fi
  sleep 1
done

echo "Error: Appium failed to start within ${TIMEOUT} seconds"
exit 1
