/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import android.util.Log
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import com.adyen.checkout.components.core.BalanceResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.components.core.PaymentMethodsApiResponse
import com.adyen.checkout.dropin.old.AddressLookupDropInServiceResult
import com.adyen.checkout.dropin.old.BalanceDropInServiceResult
import com.adyen.checkout.dropin.old.BaseDropInServiceContract
import com.adyen.checkout.dropin.old.DropIn
import com.adyen.checkout.dropin.old.DropIn.startPayment
import com.adyen.checkout.dropin.old.DropInCallback
import com.adyen.checkout.dropin.old.DropInServiceResult
import com.adyen.checkout.dropin.old.ErrorDialog
import com.adyen.checkout.dropin.old.OrderDropInServiceResult
import com.adyen.checkout.dropin.old.RecurringDropInServiceResult
import com.adyen.checkout.dropin.old.SessionDropInCallback
import com.adyen.checkout.dropin.old.internal.ui.model.DropInResultContractParams
import com.adyen.checkout.dropin.old.internal.ui.model.SessionDropInResultContractParams
import com.adyen.checkout.redirect.old.RedirectComponent
import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.BaseAddressModule
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.AdyenConstants
import com.adyenreactnativesdk.util.ReactNativeJson
import com.adyenreactnativesdk.util.messaging.EventName
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.cardEvents
import com.adyenreactnativesdk.util.messaging.dropInEvents
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import org.json.JSONException

class DropInModule(
  reactContext: ReactApplicationContext?,
  messageBus: MessageBus,
) : BaseAddressModule(reactContext, messageBus) {
  private var taskId: Int? = null

  private val integration: String
    get() = if (BaseModule.checkoutState?.isSession == true) "session" else "advanced"

  private val service: BaseDropInServiceContract
    get() =
      (if (BaseModule.checkoutState?.isSession == true) sessionService else advancedService)
        ?: throw ModuleException.NoModuleListener(integration)

  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  @ReactMethod
  fun getReturnURL(promise: Promise) {
    promise.resolve(RedirectComponent.getReturnUrl(reactApplicationContext))
  }

  override fun getName(): String = COMPONENT_NAME

  override fun supportedEvents(): List<String> = super.supportedEvents() + EventName.cardEvents() + EventName.dropInEvents()

  @ReactMethod
  fun start(paymentMethodsData: ReadableMap?) {
    if (!isInitialized) {
      return sendError(ModuleException.NoActivity())
    }

    val storedConfig = BaseModule.checkoutState?.configurationJSON
    if (storedConfig == null) {
      Log.w(TAG, "checkoutState is null — call setup() or setupAdvanced() first")
      return sendError(ModuleException.Unknown("Checkout context is not initialized. Call setup() or setupAdvanced() first."))
    }

    // TODO: v6 migration - CheckoutConfigurationFactory now returns the new v6 CheckoutConfiguration type.
    //  The old DropIn.startPayment() expects com.adyen.checkout.components.core.CheckoutConfiguration.
    //  For now, create the old CheckoutConfiguration inline from the parsed values.
    val checkoutConfiguration: CheckoutConfiguration
    val paymentMethodsResponse: PaymentMethodsApiResponse
    try {
      paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData)
      checkoutConfiguration = buildOldCheckoutConfiguration(storedConfig)
    } catch (e: java.lang.Exception) {
      return sendError(e)
    }

    startBackgroundService()
    if (BaseModule.checkoutState?.isSession == true) {
      // TODO: v6 migration - session is now CheckoutContext.Sessions, not CheckoutSession.
      //  The old DropIn.startPayment() expects CheckoutSession. Session-flow Drop-in needs
      //  proper v6 migration.
      sendError(ModuleException.Unknown("Drop-in session flow not yet supported in v6 alpha"))
    } else {
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
  fun action(actionMap: ReadableMap?) {
    try {
      // TODO: v6 migration - old DropInServiceResult.Action expects old Action type
      //  (com.adyen.checkout.components.core.action.Action), so deserialize using the old
      //  serializer instead of the v6 one from BaseActionModule.parseActionFromMap.
      val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
      val action =
        com.adyen.checkout.components.core.action.Action.SERIALIZER
          .deserialize(jsonObject)
      service.sendResult(DropInServiceResult.Action(action))
    } catch (e: Exception) {
      sendError(e)
    }
  }

  @ReactMethod
  fun completion(resultCode: String) {
    if (BaseModule.checkoutState?.isSession != true) {
      val result = DropInServiceResult.Finished(resultCode)
      service.sendResult(result)
    }

    cleanup()
    stopBackgroundService()
  }

  @ReactMethod
  fun retry(message: String?) {
    if (BaseModule.checkoutState?.isSession != true) {
      val result = DropInServiceResult.Error(null, message, true)
      service.sendResult(result)
    }

    cleanup()
    stopBackgroundService()
  }

  @ReactMethod
  fun update(array: ReadableArray?) {
    service.sendAddressLookupResult(AddressLookupDropInServiceResult.LookupResult(parseAddressOptions(array)))
  }

  @ReactMethod
  fun confirm(
    success: Boolean,
    address: ReadableMap?,
  ) {
    val result =
      if (success) {
        try {
          AddressLookupDropInServiceResult.LookupComplete(parseLookupAddress(address))
        } catch (e: Exception) {
          AddressLookupDropInServiceResult.Error(ErrorDialog(message = e.localizedMessage), null, false)
        }
      } else {
        val error = address?.getString("message")?.let { ErrorDialog(message = it) }
        AddressLookupDropInServiceResult.Error(error, null, false)
      }
    service.sendAddressLookupResult(result)
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
    service.sendRecurringResult(result)
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
    service.sendBalanceResult(result)
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
    service.sendOrderResult(result)
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

    service.sendResult(DropInServiceResult.Update(paymentMethods, order))
  }

  /**
   * Parses the payment methods JSON into the v5-era [PaymentMethodsApiResponse] type,
   * which the old DropIn API still requires.
   */
  private fun getPaymentMethodsApiResponse(paymentMethods: ReadableMap?): PaymentMethodsApiResponse =
    try {
      val jsonObject = ReactNativeJson.convertMapToJson(paymentMethods)
      PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject)
    } catch (e: JSONException) {
      throw ModuleException.InvalidPaymentMethods(e)
    }

  /**
   * Creates the old [CheckoutConfiguration] (from components-core) required by the old DropIn API.
   * TODO: v6 migration - This should be replaced with the new CheckoutConfiguration once
   *  Drop-in is migrated to the v6 API.
   */
  private fun buildOldCheckoutConfiguration(configuration: ReadableMap): CheckoutConfiguration {
    val rootParser = com.adyenreactnativesdk.configuration.RootConfigurationParser(configuration)
    val clientKey = rootParser.clientKey ?: throw ModuleException.NoClientKey()

    // Map v6 Environment → old Environment by matching the shopper base URL.
    val newEnv = rootParser.environment
    val oldEnvironment = mapToOldEnvironment(newEnv)

    return CheckoutConfiguration(
      environment = oldEnvironment,
      clientKey = clientKey,
      shopperLocale = rootParser.locale,
      amount =
        rootParser.amount?.let {
          com.adyen.checkout.components.core
            .Amount(it.currency, it.value)
        },
    )
  }

  /**
   * Maps the new v6 [com.adyen.checkout.core.common.Environment] to the old
   * [com.adyen.checkout.core.old.Environment] by matching the checkout base URL.
   */
  private fun mapToOldEnvironment(newEnv: com.adyen.checkout.core.common.Environment): com.adyen.checkout.core.old.Environment {
    val url = newEnv.checkoutShopperBaseUrl.toString()
    return when {
      url.contains("-test.") -> com.adyen.checkout.core.old.Environment.TEST
      url.contains("-live-us.") -> com.adyen.checkout.core.old.Environment.UNITED_STATES
      url.contains("-live-au.") -> com.adyen.checkout.core.old.Environment.AUSTRALIA
      url.contains("-live-apse.") -> com.adyen.checkout.core.old.Environment.APSE
      url.contains("-live-in.") -> com.adyen.checkout.core.old.Environment.INDIA
      url.contains("-live.") -> com.adyen.checkout.core.old.Environment.EUROPE
      else -> com.adyen.checkout.core.old.Environment.TEST
    }
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
    var isInitialized = false

    fun register(activity: ActivityResultCaller) {
      val callbackHandler = DropInCallbackHandler { AdyenPaymentPackage.dropInMessageBusOrNull() }
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
      isInitialized = true
    }
  }
}
