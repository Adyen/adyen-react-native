#!/bin/bash

set -euo pipefail

platform=${1:-}
device_name=${2:-}

if [ "$platform" = "expo" ]; then
  echo "::group::Prebuild Expo iOS [$(date '+%H:%M:%S')]"
  npx expo prebuild -p ios --clean
  echo "::endgroup::"
else
  echo "::group::Update Pods [$(date '+%H:%M:%S')]"
  cd ios || exit
  pod install --repo-update
  cd ..
  echo "::endgroup::"
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
UDID=$(bash ./resolve_ios_simulator.sh "$device_name")

echo "::group::Build iOS [$(date '+%H:%M:%S')]"
if ! command -v xcpretty &> /dev/null; then
  echo "Installing xcpretty..."
  gem install xcpretty
fi

XCODEBUILD_LOG="xcodebuild.log"
xcodebuild -workspace "ios/$SCHEME.xcworkspace" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath build \
  2>&1 | tee "$XCODEBUILD_LOG" | xcpretty --utf --color
echo "::endgroup::"

echo "::group::Start Metro [$(date '+%H:%M:%S')]"
bash ./start_metro.sh
echo "::endgroup::"

echo "::group::Install App on Simulator [$(date '+%H:%M:%S')]"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl install "$UDID" "build/Build/Products/Debug-iphonesimulator/$SCHEME.app"
echo "::endgroup::"

echo "::group::Run Appium Tests [$(date '+%H:%M:%S')]"
export PLATFORM_NAME=ios
export IOS_UDID="$UDID"
if [ "$platform" = "expo" ]; then
  export IOS_BUNDLE_ID="com.testproject"
else
  export IOS_BUNDLE_ID="org.reactjs.native.example.$SCHEME"
fi
node ./run-appium.js
echo "::endgroup::"
