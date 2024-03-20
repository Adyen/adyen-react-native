package com.adyenreactnativesdk.cse

import android.annotation.SuppressLint
import com.adyen.checkout.action.core.GenericActionConfiguration
import com.adyen.checkout.adyen3ds2.Cancelled3DS2Exception
import com.adyen.checkout.components.core.ActionComponentCallback
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.ComponentError
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.components.core.internal.Configuration
import com.adyen.checkout.core.exception.CancellationException
import com.adyen.threeds2.ThreeDS2Service
import com.adyenreactnativesdk.component.CheckoutProxy
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.ReactNativeJson
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class ActionModule(context: ReactApplicationContext?) : BaseModule(context),
    CheckoutProxy.ComponentEventListener, ActionComponentCallback {

    private var promise: Promise? = null

    override fun getName(): String = COMPONENT_NAME

    override fun getConstants(): MutableMap<String, Any> =
        hashMapOf(THREEDS_VERSION_NAME to THREEDS_VERSION)

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */
    }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */
    }

    // TODO: Remove restrict after updating
    @SuppressLint("RestrictedApi")
    @ReactMethod
    fun handle(actionMap: ReadableMap, configuration: ReadableMap, promise: Promise) {
        this.promise = promise
        val action: Action
        val config: Configuration
        try {
            val jsonObject = ReactNativeJson.convertMapToJson(actionMap)
            action = Action.SERIALIZER.deserialize(jsonObject)
            config = parseConfiguration(configuration)
        } catch (e: ModuleException) {
            promise.reject(e.code, e.message, e)
            return
        } catch (e: Exception) {
            promise.reject(PARSING_ERROR, e.message, e)
            return
        }
        ActionFragment.show(
            appCompatActivity.supportFragmentManager,
            config as GenericActionConfiguration,
            this,
            action
        )
    }

    @ReactMethod
    fun hide(success: Boolean?) {
        ActionFragment.hide(appCompatActivity.supportFragmentManager)
        cleanup()
        promise = null
    }

    // TODO: Remove restrict after updating
    @SuppressLint("RestrictedApi")
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
        private const val COMPONENT_ERROR = "actionError"
        private const val PARSING_ERROR = "parsingError"
    }

    override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
        val json = ActionComponentData.SERIALIZER.serialize(actionComponentData)
        promise?.resolve(ReactNativeJson.convertJsonToMap(json))
    }

    override fun onError(componentError: ComponentError) {
        if (componentError.exception is CancellationException ||
            componentError.exception is Cancelled3DS2Exception
        ) {
            promise?.reject(
                ModuleException.Canceled().code,
                ModuleException.Canceled().message,
                ModuleException.Canceled()
            )
        } else {
            promise?.reject(COMPONENT_ERROR, componentError.errorMessage, componentError.exception)
        }
    }
}

