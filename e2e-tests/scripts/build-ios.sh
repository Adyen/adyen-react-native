#!/bin/bash

set -euo pipefail

platform=${1:-}
device_name=${2:-}
os_version=${3:-}

if [ "$platform" = "Expo" ]; then
  echo "== Prebuild Expo iOS"
  npx expo prebuild -p ios --clean
else
  echo "== Update Pods"
  cd ios || exit
  pod install --repo-update
  cd ..
fi

# Find the workspace file dynamically (after ios directory is created)
WORKSPACE=$(find ios -maxdepth 1 -name "*.xcworkspace" | head -n 1)
if [ -z "$WORKSPACE" ]; then
  echo "Error: No .xcworkspace found in ios directory"
  exit 1
fi

# Extract scheme name from workspace (remove path and extension)
SCHEME=$(basename "$WORKSPACE" .xcworkspace)
echo "Using workspace: $WORKSPACE with scheme: $SCHEME"

# Resolve simulator UDID
UDID=$(bash ./resolve_ios_simulator.sh "$device_name" "$os_version")

echo "== Build iOS"
if ! command -v xcpretty &> /dev/null; then
  echo "Installing xcpretty..."
  gem install xcpretty
fi

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
