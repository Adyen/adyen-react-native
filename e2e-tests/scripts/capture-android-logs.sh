#!/bin/bash

# Runs build-android.sh and keeps its output, the Appium server log and (on failure)
# an `adb logcat -d` dump under $ANDROID_LOGS_DIR. Must run inside the emulator
# session: the emulator is gone once android-emulator-runner finishes.

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR=${ANDROID_LOGS_DIR:-android_logs}

mkdir -p "$LOGS_DIR"
LOGS_DIR="$(cd -- "$LOGS_DIR" && pwd)"

export APPIUM_LOG_FILE="$LOGS_DIR/appium.log"
export APPIUM_LOG_LEVEL=${APPIUM_LOG_LEVEL:-info}

bash "$SCRIPT_DIR/build-android.sh" "$@" 2>&1 | tee "$LOGS_DIR/build-android.log"
# pipefail is not enough here: the exit code of build-android.sh must be read before any other command runs.
status=${PIPESTATUS[0]}

if [ "$status" -ne 0 ]; then
  echo "== build-android.sh failed with exit code $status, collecting logcat"
  adb logcat -d > "$LOGS_DIR/logcat.txt" 2>&1 || true
  [ -f metro.log ] && cp metro.log "$LOGS_DIR/metro.log"
fi

exit "$status"
