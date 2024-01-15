package com.adyenreactnativesdk.cse

import androidx.lifecycle.lifecycleScope
import com.adyen.checkout.action.core.GenericActionComponent
import com.adyen.checkout.action.core.GenericActionConfiguration
import com.adyen.checkout.components.core.ActionComponentCallback
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.threeds2.ThreeDS2Service
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.launch
import org.json.JSONException

class ActionModule(context: ReactApplicationContext?) : BaseModule(context), CheckoutProxy.ComponentEventListener, ActionComponentCallback {

    private var promise: Promise? = null

    override fun getName(): String = COMPONENT_NAME

    override fun getConstants(): MutableMap<String, Any> =
        hashMapOf(THREEDS_VERSION_NAME to THREEDS_VERSION)

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }

    @ReactMethod
    fun handle(actionMap: ReadableMap, configuration: ReadableMap, promise: Promise) {
        this.promise = promise
        try {
            val config = parseConfiguration(configuration)
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            val action = Action.SERIALIZER.deserialize(jsonObject)
            var callback = this
            appCompatActivity.lifecycleScope.launch {
                val component = GenericActionComponent.PROVIDER.get(appCompatActivity, config as GenericActionConfiguration, callback, TAG)
                component.handleAction(action, appCompatActivity)
                AdyenCheckout.setIntentHandler(component)
            }
        } catch (e: JSONException) {
            promise.reject(TAG, e.message, e)
        }
    }

    @ReactMethod
    fun hide(success: Boolean?) {
        cleanup()
        promise = null
    }

    override fun parseConfiguration(json: ReadableMap): Configuration {
        val config = setupRootConfig(json)

        val configuration = GenericActionConfiguration.Builder(locale, environment, clientKey)
        // TODO: add .setAnalyticsConfiguration(getAnalyticsConfiguration())

        return configuration.build()
    }

    companion object {
        private const val COMPONENT_NAME = "AdyenAction"
        private const val TAG = "ActionModule"
        private var THREEDS_VERSION = ThreeDS2Service.INSTANCE.sdkVersion
        private const val THREEDS_VERSION_NAME = "threeDS2SdkVersion"
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        val json = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        promise?.resolve(ReactNativeJson.convertJsonToMap(json))
    }

    override fun onError(componentError: ComponentError) {
        promise?.reject(TAG, componentError.errorMessage, componentError.exception)
    }
}

