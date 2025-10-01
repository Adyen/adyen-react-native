package com.adyenreactnativesdk.configuration

import com.facebook.react.bridge.ReadableMap

class PartialPaymentParser(
  config: ReadableMap,
) {
  companion object {
    const val ROOT_KEY = "partialPayment"
    const val PIN_REQUIRED_KEY = "pinRequired"
  }

  private var config: ReadableMap

  init {
    if (config.hasKey(ROOT_KEY)) {
      this.config = config.getMap(ROOT_KEY)!!
    } else {
      this.config = config
    }
  }

  val pinRequired: Boolean
    get() =
      if (config.hasKey(PIN_REQUIRED_KEY)) {
        config.getBoolean(PIN_REQUIRED_KEY)
      } else {
        true
      }
}
