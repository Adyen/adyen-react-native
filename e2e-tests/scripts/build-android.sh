#!/bin/bash

set -euo pipefail

PROJECT_NAME=testproject
APP_PACKAGE=com.$PROJECT_NAME

platform=${1:-}

if [ "$platform" = "expo" ]; then
  echo "::group::Prebuild Expo Android [$(date '+%H:%M:%S')]"
  npx expo prebuild -p android --clean
  echo "::endgroup::"
fi

echo "::group::Build Android [$(date '+%H:%M:%S')]"
cd android || exit
chmod +x ./gradlew
./gradlew installDebug || bash ./gradlew installDebug
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

echo "::group::Run Appium Tests [$(date '+%H:%M:%S')]"
export PLATFORM_NAME=android
export APP_PACKAGE
node ./run-appium.js
echo "::endgroup::"
