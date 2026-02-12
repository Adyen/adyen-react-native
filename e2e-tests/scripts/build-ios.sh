#!/bin/bash

set -euo pipefail

platform=${1:-}
device_name=${2:-}
os_version=${3:-}

SCHEME="TestProject"

if [ "$platform" = "Expo" ]; then
  echo "== Prebuild Expo iOS"
  npx expo prebuild -p ios --clean
else
  echo "== Update Pods"
  cd ios || exit
  pod install --repo-update
  cd ..
fi

# Resolve simulator UDID
UDID=$(bash ./resolve_ios_simulator.sh "$device_name" "$os_version")

echo "== Build iOS"
xcodebuild -workspace "ios/$SCHEME.xcworkspace" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath build \
  | xcpretty --utf --color

bash ./start_metro.sh

echo "== Install App on Simulator"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "build/Build/Products/Debug-iphonesimulator/$SCHEME.app"

echo "== Run Appium Tests"
export PLATFORM_NAME=ios
export IOS_UDID="$UDID"
export IOS_SCHEME="$SCHEME"
node ./run-appium.js
