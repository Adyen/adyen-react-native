package com.adyenreactnativesdk.component.base

import android.util.Log
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.dropin.AddressLookupDropInServiceResult
import com.adyen.checkout.dropin.ErrorDialog
import com.adyenreactnativesdk.component.model.fromJsonObject
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.map
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.addressLookupEvents
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

abstract class BaseAddressModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseActionModule(reactContext, messageBus) {
  override fun supportedEvents(): List<String> = super.supportedEvents() + EventName.addressLookupEvents()

  open fun update(array: ReadableArray?) {
    val result =
      try {
        val jsonArray = ReactNativeJson.convertArrayToJson(array)
        val addresses = jsonArray.map { LookupAddress::class.fromJsonObject(it) }
        AddressLookupDropInServiceResult.LookupResult(addresses.toList())
      } catch (error: Throwable) {
        Log.w(TAG, error)
        AddressLookupDropInServiceResult.LookupResult(arrayListOf())
      }
    sendAddressLookupResult(result)
  }

  open fun confirm(
    success: Boolean,
    address: ReadableMap?,
  ) {
    val result =
      if (success) {
        try {
          val jsonObject = ReactNativeJson.convertMapToJson(address)
          val lookupAddress = LookupAddress::class.fromJsonObject(jsonObject)
          AddressLookupDropInServiceResult.LookupComplete(lookupAddress)
        } catch (error: Throwable) {
          lookupError(error.localizedMessage)
        }
      } else {
        lookupError(address?.getString("message"))
      }
    sendAddressLookupResult(result)
  }

  private fun lookupError(message: String?): AddressLookupDropInServiceResult.Error =
    AddressLookupDropInServiceResult.Error(
      message?.let { ErrorDialog(message = it) },
      null,
      false,
    )

  abstract fun sendAddressLookupResult(result: AddressLookupDropInServiceResult)

  private companion object {
    private const val TAG = "BaseAddressModule"
  }
}
