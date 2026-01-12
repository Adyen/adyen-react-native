#!/bin/bash

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
./gradlew assembleDebug
cd ..

echo "== Run Appium Tests"
node ../scripts/check-app.js --platform android