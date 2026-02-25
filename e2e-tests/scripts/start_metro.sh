#!/bin/bash

set -euo pipefail

PORT=${1:-8081}
METRO_LOG="metro.log"

echo "== Start Metro on port $PORT"
yarn start --port "$PORT" > "$METRO_LOG" 2>&1 &

for i in {1..45}; do
  if nc -z 127.0.0.1 "$PORT"; then
    echo "== Metro started successfully"
    exit 0
  fi
  sleep 1
done

echo "Error: Metro failed to start within 60 seconds"
echo "== Metro log:"
cat "$METRO_LOG"
exit 1
