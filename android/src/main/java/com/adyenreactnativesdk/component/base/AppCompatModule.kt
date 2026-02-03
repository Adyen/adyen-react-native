package com.adyenreactnativesdk.component.base

import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

abstract class AppCompatModule(
  reactContext: ReactApplicationContext?,
) : ReactContextBaseJavaModule(reactContext) {
  protected val appCompatActivity: AppCompatActivity
    get() {
      val currentActivity = getCurrentActivity()
      return currentActivity as AppCompatActivity?
        ?: throw IllegalStateException("Not an AppCompact Activity")
    }
}
