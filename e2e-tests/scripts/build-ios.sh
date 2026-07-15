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

echo "::group::Patch fmt for Xcode 26 [$(date '+%H:%M:%S')]"
# Xcode 26's Apple Clang breaks consteval in fmt 11.0.2 (RN 0.80.2 / Expo SDK 52
# fixtures). base.h ignores a pre-defined FMT_USE_CONSTEVAL, so patch the header.
FMT_BASE="ios/Pods/fmt/include/fmt/base.h"
if [ -f "$FMT_BASE" ] && ! grep -q "Xcode 26 workaround" "$FMT_BASE"; then
  chmod 0644 "$FMT_BASE"
  perl -0pi -e 's/(#elif defined\(__cpp_consteval\)\n#  define FMT_USE_CONSTEVAL) 1/\/\/ Xcode 26 workaround: disable consteval\n$1 0/' "$FMT_BASE"
  echo "Patched $FMT_BASE"
fi
echo "::endgroup::"

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
if ! command -v xcbeautify &> /dev/null; then
  echo "Installing xcbeautify..."
  HOMEBREW_NO_AUTO_UPDATE=1 brew install xcbeautify
fi

XCODEBUILD_LOG="xcodebuild.log"
xcodebuild -workspace "ios/$SCHEME.xcworkspace" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath build \
  2>&1 | tee "$XCODEBUILD_LOG" | xcbeautify --renderer github-actions
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
