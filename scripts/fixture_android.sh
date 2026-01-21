#!/bin/bash

set -euo pipefail

PROJECT_NAME=testproject
APP_PACKAGE=com.$PROJECT_NAME

platform=${1:-}

if [ "$platform" == "Expo" ]; then
  echo "== Prebuild Expo Android"
  npx expo prebuild -p android --clean
else
  echo -e "== Add default MainActivity.kt\n"
  
  mkdir -p android/app/src/main/java/com/$PROJECT_NAME
  cp ../fixture/MainActivity.kt.template android/app/src/main/java/com/$PROJECT_NAME/MainActivity.kt
fi

echo "== Build Android"
cd android || exit
chmod +x ./gradlew || true
./gradlew installDebug || bash ./gradlew installDebug
cd ..

bash ../scripts/start_metro.sh

echo "== Reverse Metro Port"
adb reverse tcp:8081 tcp:8081 || true

echo "== Launch App"
adb shell am start -n "$APP_PACKAGE/.MainActivity" >/dev/null 2>&1 || true

echo "== Run Appium Tests"
export PLATFORM_NAME=android
export APP_PACKAGE
node ./check-app.js
