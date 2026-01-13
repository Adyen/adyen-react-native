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

  cat > android/app/src/main/java/com/testproject/MainActivity.kt <<- 'EOF'
package com.testproject

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.adyenreactnativesdk.AdyenCheckout

class MainActivity : ReactActivity() {
  override fun getMainComponentName(): String = "TestProject"
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    AdyenCheckout.setLauncherActivity(this)
  }
}
EOF
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

echo "== Start Metro"
yarn start --port 8081 >/dev/null 2>&1 &
for i in {1..30}; do
  nc -z 127.0.0.1 8081 && break
  sleep 1
done

echo "== Reverse Metro Port"
adb reverse tcp:8081 tcp:8081 || true

echo "== Launch App"
adb shell am start -n "$APP_PACKAGE/$APP_ACTIVITY" >/dev/null 2>&1 || true

echo "== Run Appium Tests"
export PLATFORM_NAME=android
export APP_PACKAGE
export APP_ACTIVITY
node ./check-app.js