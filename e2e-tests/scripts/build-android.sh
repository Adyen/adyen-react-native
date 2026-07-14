#!/bin/bash

set -euo pipefail

PROJECT_NAME=testproject
APP_PACKAGE=com.$PROJECT_NAME

platform=${1:-}
BOOT_TIMEOUT=300
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

echo "::group::Booting emulator [$(date '+%H:%M:%S')]"
adb wait-for-device
boot_elapsed=0
until [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do
  if [ "$boot_elapsed" -ge "$BOOT_TIMEOUT" ]; then
    echo "Error: Emulator failed to boot within $BOOT_TIMEOUT seconds"
    exit 1
  fi
  sleep 2
  boot_elapsed=$((boot_elapsed + 2))
done
echo "::endgroup::"

if [ "$platform" = "expo" ]; then
  echo "::group::Prebuild Expo Android [$(date '+%H:%M:%S')]"
  npx expo prebuild -p android --clean
  echo "::endgroup::"
fi

echo "::group::Build Android [$(date '+%H:%M:%S')]"
cd android || exit
chmod +x ./gradlew
./gradlew installDebug
cd ..
echo "::endgroup::"

echo "::group::Start Metro [$(date '+%H:%M:%S')]"
bash ./start_metro.sh
echo "::endgroup::"

echo "::group::Reverse Metro Port [$(date '+%H:%M:%S')]"
adb reverse tcp:8081 tcp:8081
echo "::endgroup::"

echo "::group::Launch App [$(date '+%H:%M:%S')]"
adb shell am start -n "$APP_PACKAGE/.MainActivity"
echo "::endgroup::"

echo "::group::Pre-install Appium APKs [$(date '+%H:%M:%S')]"
SETTINGS_APK=$(find "$HOME/.appium" -name "settings_apk-debug.apk" 2>/dev/null | head -n 1)
if [ -n "$SETTINGS_APK" ]; then
  echo "Installing io.appium.settings from: $SETTINGS_APK"
  adb install -r -t -g "$SETTINGS_APK"
else
  echo "Error: settings_apk-debug.apk not found under $HOME/.appium"
  exit 1
fi
echo "::endgroup::"

cleanup_appium() {
  if [ -f .appium.pid ]; then
    APPIUM_PID=$(cat .appium.pid)
    kill "$APPIUM_PID" 2>/dev/null || true
    for _ in {1..10}; do
      kill -0 "$APPIUM_PID" 2>/dev/null || break
      sleep 1
    done
    kill -9 "$APPIUM_PID" 2>/dev/null || true
    rm -f .appium.pid
  fi
}

trap cleanup_appium EXIT

echo "::group::Start Appium [$(date '+%H:%M:%S')]"
APPIUM_PID_FILE=.appium.pid bash "$SCRIPT_DIR/start_appium.sh" 4723 30
echo "::endgroup::"

echo "::group::Run Appium Tests [$(date '+%H:%M:%S')]"
export PLATFORM_NAME=android
export APP_PACKAGE
node ./run-appium.js
echo "::endgroup::"
