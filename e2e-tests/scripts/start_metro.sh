#!/bin/bash

set -euo pipefail

PORT=${1:-8081}

echo "== Start Metro on port $PORT"
yarn start --port "$PORT" >/dev/null 2>&1 &

for i in {1..30}; do
  if nc -z 127.0.0.1 "$PORT"; then
    echo "== Metro started successfully"
    exit 0
  fi
  sleep 1
done

echo "Error: Metro failed to start within 30 seconds"
exit 1
