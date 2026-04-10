/*
 * Copyright (c) 2025 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import android.util.Log
import com.adyen.checkout.components.core.LookupAddress
import com.adyenreactnativesdk.component.model.fromJsonObject
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.map
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.addressLookupEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

open class BaseAddressModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseActionModule(reactContext, messageBus) {
  override fun supportedEvents(): List<String> = super.supportedEvents() + EventName.addressLookupEvents()

  protected fun parseAddressOptions(array: ReadableArray?): List<LookupAddress> =
    try {
      val jsonArray = ReactNativeJson.convertArrayToJson(array)
      jsonArray.map { LookupAddress::class.fromJsonObject(it) }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to parse address options", e)
      emptyList()
    }

  protected fun parseLookupAddress(address: ReadableMap?): LookupAddress =
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(address)
      LookupAddress::class.fromJsonObject(jsonObject)
    } catch (e: Exception) {
      throw ModuleException.InvalidAction(e)
    }

  private companion object {
    private const val TAG = "BaseAddressModule"
  }
}
