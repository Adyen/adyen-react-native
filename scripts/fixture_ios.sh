#!/bin/bash

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
xcodebuild -workspace "ios/$SCHEME.xcworkspace" -scheme "$SCHEME" -configuration Debug -sdk iphonesimulator -destination "platform=iOS Simulator,name=$device_name,OS=$os_version" -quiet

echo "== Run Appium Tests"
node ../scripts/check-app.js --platform ios