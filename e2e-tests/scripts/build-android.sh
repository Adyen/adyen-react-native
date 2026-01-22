#!/bin/bash

set -euo pipefail

PROJECT_NAME=testproject
APP_PACKAGE=com.$PROJECT_NAME

platform=${1:-}

if [ "$platform" == "Expo" ]; then
  echo "== Prebuild Expo Android"
  npx expo prebuild -p android --clean
fi

echo "== Build Android"
cd android || exit
chmod +x ./gradlew
./gradlew installDebug || bash ./gradlew installDebug
cd ..

bash ./start_metro.sh

echo "== Reverse Metro Port"
adb reverse tcp:8081 tcp:8081

echo "== Launch App"
adb shell am start -n "$APP_PACKAGE/.MainActivity"

echo "== Run Appium Tests"
export PLATFORM_NAME=android
export APP_PACKAGE
node ./run-appium.js
