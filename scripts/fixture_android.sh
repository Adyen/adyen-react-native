#!/bin/bash

set -euo pipefail

name=$1
platform=$2
api_level=$3

if [ -z "$name" ]; then
  echo "Error: App name argument missing."
  exit 1
fi

cd "$name" || exit

if [ "$platform" == "Expo" ]; then
  echo "== Prebuild Expo Android"
  npx expo prebuild -p android --clean
else
  echo -e "== Add default MainActivity.kt\n"
  
  mkdir -p android/app/src/main/java/com/testproject

  cp ../fixture/MainActivity.kt.template android/app/src/main/java/com/testproject/MainActivity.kt
fi

echo "== Build Android"
cd android || exit
chmod +x ./gradlew || true
./gradlew installDebug || bash ./gradlew installDebug
cd ..

APP_PACKAGE=$(grep -m 1 -E 'applicationId\s+"' android/app/build.gradle | awk -F '"' '{print $2}')
APP_ACTIVITY=${APP_ACTIVITY:-.MainActivity}
if [ -z "${APP_PACKAGE:-}" ]; then
  APP_PACKAGE=com.testproject
fi

bash ../scripts/start_metro.sh

echo "== Reverse Metro Port"
adb reverse tcp:8081 tcp:8081 || true

echo "== Launch App"
adb shell am start -n "$APP_PACKAGE/$APP_ACTIVITY" >/dev/null 2>&1 || true

echo "== Run Appium Tests"
export PLATFORM_NAME=android
export APP_PACKAGE
export APP_ACTIVITY
node ./check-app.js
