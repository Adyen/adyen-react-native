#!/bin/bash

set -euo pipefail

name=${1:-}
platform=${2:-}
device_name=${3:-}
os_version=${4:-}

if [ -z "$name" ]; then
  echo "Error: App name argument missing."
  exit 1
fi

cd "$name" || exit

if [ "$platform" == "Expo" ]; then
  echo "== Prebuild Expo iOS"
  npx expo prebuild -p ios --clean
  SCHEME="$name"
else
  echo "== Update Pods"
  cd ios || exit
  pod install --repo-update
  cd ..
  SCHEME="TestProject"
fi

if [ -n "${os_version:-}" ]; then
  RUNTIME_NAME="iOS $os_version"
else
  RUNTIME_NAME=""
fi

if [ -z "${RUNTIME_NAME:-}" ] || ! xcrun simctl list runtimes | grep -Fq "$RUNTIME_NAME"; then
  RUNTIME_NAME=$(xcrun simctl list runtimes | grep -E '^iOS ' | grep -v unavailable | awk '{print $1" "$2}' | tail -n 1)
fi

if [ -z "${RUNTIME_NAME:-}" ]; then
  echo "Error: Could not find any available iOS simulator runtime."
  xcrun simctl list runtimes || true
  exit 1
fi

os_version=${RUNTIME_NAME#iOS }

UDID=""
if [ -n "${device_name:-}" ]; then
  UDID=$(xcrun simctl list devices "$RUNTIME_NAME" | grep -F "$device_name (" | head -n 1 | awk -F '[()]' '{print $2}' || true)
fi

if [ -z "${UDID:-}" ]; then
  device_name=$(xcrun simctl list devices "$RUNTIME_NAME" | grep -E 'iPhone.*\(' | tail -n 1 | awk -F '(' '{print $1}' | sed 's/[[:space:]]*$//' || true)
  UDID=$(xcrun simctl list devices "$RUNTIME_NAME" | grep -F "$device_name (" | head -n 1 | awk -F '[()]' '{print $2}' || true)
fi

if [ -z "${UDID:-}" ] || [ -z "${device_name:-}" ]; then
  echo "Error: Could not find an iPhone simulator device for $RUNTIME_NAME."
  xcrun simctl list devices "$RUNTIME_NAME" || true
  exit 1
fi

echo "== Using Simulator: $device_name (iOS $os_version)"

echo "== Build iOS"
xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=$device_name,OS=$os_version" -derivedDataPath build -quiet

echo "== Start Metro"
yarn start --port 8081 >/dev/null 2>&1 &
for i in {1..30}; do
  nc -z 127.0.0.1 8081 && break
  sleep 1
done

echo "== Install App on Simulator"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "build/Build/Products/Debug-iphonesimulator/$SCHEME.app"

echo "== Run Appium Tests"
export PLATFORM_NAME=ios
export IOS_UDID="$UDID"
export IOS_DEVICE_NAME="$device_name"
export IOS_PLATFORM_VERSION="$os_version"
node ./check-app.js