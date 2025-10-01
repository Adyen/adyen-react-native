package com.adyenreactnativesdk.configuration

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.facebook.react.bridge.ReadableMap

class ThreeDSConfigurationParser(
  config: ReadableMap,
) {
  companion object {
    const val TAG = "ThreeDSConfigurationParser"
    const val ROOT_KEY = "threeDS2"
    const val REQUESTOR_APP_URL_KEY = "requestorAppUrl"
  }

  private var config: ReadableMap

  init {
    if (config.hasKey(ROOT_KEY)) {
      this.config = config.getMap(ROOT_KEY)!!
    } else {
      this.config = config
    }
  }

  internal val requestorAppUrl: String?
    get() =
      if (config.hasKey(REQUESTOR_APP_URL_KEY)) {
        config.getString(REQUESTOR_APP_URL_KEY)
      } else {
        null
      }

  fun applyConfiguration(builder: Adyen3DS2Configuration.Builder) {
    requestorAppUrl?.let { builder.setThreeDSRequestorAppURL(it) }
  }
}
