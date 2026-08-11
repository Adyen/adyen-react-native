/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.authentication.authentication
import com.adyen.checkout.core.components.CheckoutConfiguration
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

  fun applyConfiguration(configuration: CheckoutConfiguration) {
    configuration.authentication(threeDSRequestorAppURL = requestorAppUrl)
  }
}
