#!/bin/bash

set -euo pipefail

name=$1
platform=$2
device_name=$3
os_version=$4

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

echo "== Build iOS"
xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=$device_name,OS=$os_version" -derivedDataPath build -quiet

echo "== Start Metro"
yarn start --port 8081 >/dev/null 2>&1 &
for i in {1..30}; do
  nc -z 127.0.0.1 8081 && break
  sleep 1
done

echo "== Install App on Simulator"
RUNTIME_ID=$(xcrun simctl list runtimes | grep -F "iOS $os_version" | head -n 1 | awk -F '[()]' '{print $2}')
UDID=$(xcrun simctl list devices "$RUNTIME_ID" | grep -F "$device_name (" | head -n 1 | awk -F '[()]' '{print $2}')
if [ -z "$UDID" ]; then
  echo "Error: Could not find simulator UDID for $device_name (iOS $os_version)"
  exit 1
fi

xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "build/Build/Products/Debug-iphonesimulator/$SCHEME.app"

echo "== Run Appium Tests"
export PLATFORM_NAME=ios
node ../scripts/check-app.js