/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import android.util.Log
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.BalanceResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.dropin.AddressLookupDropInServiceResult
import com.adyen.checkout.dropin.BalanceDropInServiceResult
import com.adyen.checkout.dropin.BaseDropInServiceContract
import com.adyen.checkout.dropin.DropIn
import com.adyen.checkout.dropin.DropIn.startPayment
import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInServiceResult
import com.adyen.checkout.dropin.ErrorDialog
import com.adyen.checkout.dropin.OrderDropInServiceResult
import com.adyen.checkout.dropin.RecurringDropInServiceResult
import com.adyen.checkout.dropin.SessionDropInCallback
import com.adyen.checkout.dropin.internal.ui.model.DropInResultContractParams
import com.adyen.checkout.dropin.internal.ui.model.SessionDropInResultContractParams
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.configuration.CheckoutConfigurationFactory
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.CardComponentEventListener
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import com.google.gson.Gson

class DropInModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
  private val gson: Gson,
) : BaseModule(reactContext, messageBus),
  AddressLookupCallback,
  CardComponentEventListener {
  private var taskId: Int? = null

  private fun getService(): BaseDropInServiceContract? = if (session != null) sessionService else advancedService

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  override fun getConstants(): MutableMap<String, Any> = mutableMapOf("supportedEvents" to supportedEvents())

  @ReactMethod
  fun getReturnURL(promise: Promise) {
    promise.resolve(RedirectComponent.getReturnUrl(reactApplicationContext))
  }

  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = EventName.entries.map { it.value }

  @ReactMethod
  fun open(
    paymentMethodsData: ReadableMap?,
    configuration: ReadableMap,
  ) {
    val checkoutConfiguration: CheckoutConfiguration
    val paymentMethodsResponse: PaymentMethodsApiResponse
    try {
      paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData)
      checkoutConfiguration = CheckoutConfigurationFactory.get(configuration)
    } catch (e: java.lang.Exception) {
      return sendError(e)
    }

    val session = session
    if (session != null) {
      startBackgroundService()
      startPayment(
        reactApplicationContext,
        dropInSessionLauncher,
        session,
        checkoutConfiguration,
        SessionCheckoutService::class.java,
      )
    } else {
      startBackgroundService()
      startPayment(
        reactApplicationContext,
        dropInLauncher,
        paymentMethodsResponse,
        checkoutConfiguration,
        AdvancedCheckoutService::class.java,
      )
    }
  }

  @ReactMethod
  fun handle(actionMap: ReadableMap?) {
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      val action = Action.SERIALIZER.deserialize(jsonObject)
      getService()?.sendResult(DropInServiceResult.Action(action))
    } catch (e: Exception) {
      sendError(ModuleException.InvalidAction(e))
    }
  }

  @ReactMethod
  fun hide(
    success: Boolean,
    message: ReadableMap?,
  ) {
    if (session == null) {
      proxyHideDropInCommand(success, message)
    }

    cleanup()
    stopBackgroundService()
  }

  @ReactMethod
  fun update(array: ReadableArray?) {
    val result =
      try {
        val jsonString = ReactNativeJson.convertArrayToJson(array).toString()
        val addresses = gson.fromJson(jsonString, Array<LookupAddress>::class.java)
        AddressLookupDropInServiceResult.LookupResult(addresses.toList())
      } catch (error: Throwable) {
        Log.w(TAG, error)
        AddressLookupDropInServiceResult.LookupResult(arrayListOf())
      }
    getService()?.sendAddressLookupResult(result)
  }

  @ReactMethod
  fun confirm(
    success: Boolean,
    address: ReadableMap?,
  ) {
    val result =
      if (success) {
        try {
          val jsonString = ReactNativeJson.convertMapToJson(address).toString()
          val lookupAddress = gson.fromJson(jsonString, LookupAddress::class.java)
          AddressLookupDropInServiceResult.LookupComplete(lookupAddress)
        } catch (error: Throwable) {
          AddressLookupDropInServiceResult.Error(
            ErrorDialog(
              message = error.localizedMessage,
            ),
            null,
            false,
          )
        }
      } else {
        val error = address?.getString("message")?.let { ErrorDialog(message = it) }
        AddressLookupDropInServiceResult.Error(
          error,
          null,
          false,
        )
      }
    getService()?.sendAddressLookupResult(result)
  }

  @ReactMethod
  fun removeStored(success: Boolean) {
    val id = storedPaymentMethodID
    if (id == null) {
      Log.w(TAG, "No stored payment method was marked for removal")
      return
    }

    val result =
      when {
        success -> {
          RecurringDropInServiceResult.PaymentMethodRemoved(id)
        }

        else -> {
          RecurringDropInServiceResult.Error(null, null, false)
        }
      }
    advancedService?.sendRecurringResult(result)
    storedPaymentMethodID = null
  }

  @ReactMethod
  fun provideBalance(
    success: Boolean,
    balance: ReadableMap?,
    error: ReadableMap?,
  ) {
    val result =
      if (success) {
        val jsonObject = ReactNativeJson.convertMapToJson(balance)
        val balanceResult = BalanceResult.SERIALIZER.deserialize(jsonObject)
        BalanceDropInServiceResult.Balance(balanceResult)
      } else {
        val message = error?.getString(AdyenConstants.PARAMETER_MESSAGE)
        BalanceDropInServiceResult.Error(null, message, true)
      }
    getService()?.sendBalanceResult(result)
  }

  @ReactMethod
  fun provideOrder(
    success: Boolean,
    order: ReadableMap?,
    error: ReadableMap?,
  ) {
    val result =
      if (success) {
        val jsonObject = ReactNativeJson.convertMapToJson(order)
        val orderResponse = OrderResponse.SERIALIZER.deserialize(jsonObject)
        OrderDropInServiceResult.OrderCreated(orderResponse)
      } else {
        val message = error?.getString(AdyenConstants.PARAMETER_MESSAGE)
        OrderDropInServiceResult.Error(null, message, true)
      }
    getService()?.sendOrderResult(result)
  }

  @ReactMethod
  fun providePaymentMethods(
    paymentMethods: ReadableMap,
    map: ReadableMap?,
  ) {
    val pmJsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
    val paymentMethods = PaymentMethodsApiResponse.SERIALIZER.deserialize(pmJsonObject)
    val order =
      map?.let {
        val jsonObject = ReactNativeJson.convertMapToJson(it)
        OrderResponse.SERIALIZER.deserialize(jsonObject)
      }

    getService()?.sendResult(DropInServiceResult.Update(paymentMethods, order))
  }

  private fun proxyHideDropInCommand(
    success: Boolean,
    message: ReadableMap?,
  ) {
    val messageString = message?.getString(AdyenConstants.PARAMETER_MESSAGE)
    val result =
      if (success && messageString != null) {
        DropInServiceResult.Finished(messageString)
      } else {
        DropInServiceResult.Error(null, messageString, true)
      }
    getService()?.sendResult(result)
  }

  private fun startBackgroundService() {
    val config =
      HeadlessJsTaskConfig(
        TASK_NAME,
        Arguments.createMap(),
        0,
        true,
      )
    val context = HeadlessJsTaskContext.getInstance(reactApplicationContext)
    taskId?.let { context.finishTask(it) }
    taskId = context.startTask(config)
  }

  private fun stopBackgroundService() {
    taskId?.let { HeadlessJsTaskContext.getInstance(reactApplicationContext).finishTask(it) }
  }

  companion object {
    private lateinit var dropInSessionLauncher: ActivityResultLauncher<SessionDropInResultContractParams>
    private lateinit var dropInLauncher: ActivityResultLauncher<DropInResultContractParams>
    private const val TAG = "DropInComponent"
    private const val COMPONENT_NAME = "AdyenDropIn"
    private const val TASK_NAME = "ADYEN_DROPIN_TASK"
    internal var sessionService: BaseDropInServiceContract? = null
    internal var advancedService: BaseDropInServiceContract? = null
    var storedPaymentMethodID: String? = null

    fun register(activity: ActivityResultCaller) {
      val callbackHandler = DropInCallbackHandler { AdyenPaymentPackage.messageBusOrNull() }
      dropInSessionLauncher =
        DropIn.registerForDropInResult(
          activity,
          callbackHandler as SessionDropInCallback,
        )
      dropInLauncher =
        DropIn.registerForDropInResult(
          activity,
          callbackHandler as DropInCallback,
        )
    }
  }

  override fun onQueryChanged(query: String) = messageBus.onQueryChanged(query)

  override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean = messageBus.onLookupCompletion(lookupAddress)

  override fun onBinValue(binValue: String) = messageBus.onBinValue(binValue)

  override fun onBinLookup(data: List<BinLookupData>) = messageBus.onBinLookup(data)
}
