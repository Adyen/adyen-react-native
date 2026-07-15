package com.adyenexample

import android.content.Intent
import android.os.Bundle
import android.util.Base64
import com.adyenreactnativesdk.AdyenCheckout
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {
  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AdyenExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
      override fun getLaunchOptions(): Bundle? {
        val configBase64 = this@MainActivity.intent?.getStringExtra("config") ?: return null
        return try {
          val decoded = String(Base64.decode(configBase64, Base64.DEFAULT), Charsets.UTF_8)
          Bundle().apply { putString("externalConfig", decoded) }
        } catch (e: Exception) {
          null
        }
      }
    }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    AdyenCheckout.setLauncherActivity(this)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    AdyenCheckout.handleIntent(intent)
  }
}
