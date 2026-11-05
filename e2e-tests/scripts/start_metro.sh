#!/bin/bash

set -euo pipefail

PORT=${1:-8081}
METRO_LOG="metro.log"

echo "== Start Metro on port $PORT"
yarn start --port "$PORT" > "$METRO_LOG" 2>&1 &

# A Debug app asks Metro's /status once at launch (about 6 s timeout) and shows
# "No script URL provided" if that fails, so an open port is not enough.
for i in {1..60}; do
  if [ "$(curl -s --max-time 2 "http://127.0.0.1:$PORT/status")" = "packager-status:running" ]; then
    echo "== Metro started successfully"
    exit 0
  fi
  sleep 1
done

echo "Error: Metro failed to start within 60 seconds"
echo "== Metro log:"
cat "$METRO_LOG"
exit 1
