/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.action

import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Observer
import com.adyen.checkout.adyen3ds2.Adyen3DS2Component
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.await.AwaitComponent
import com.adyen.checkout.await.AwaitConfiguration
import com.adyen.checkout.await.AwaitView
import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.ActionComponentProvider
import com.adyen.checkout.components.ComponentView
import com.adyen.checkout.components.ViewableComponent
import com.adyen.checkout.components.base.*
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.components.util.ActionTypes
import com.adyen.checkout.core.api.Environment
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.core.log.LogUtil
import com.adyen.checkout.qrcode.QRCodeComponent
import com.adyen.checkout.qrcode.QRCodeConfiguration
import com.adyen.checkout.qrcode.QRCodeView
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.redirect.RedirectConfiguration
import com.adyen.checkout.voucher.VoucherComponent
import com.adyen.checkout.voucher.VoucherConfiguration
import com.adyen.checkout.voucher.VoucherView
import com.adyen.checkout.wechatpay.WeChatPayActionComponent
import com.adyen.checkout.wechatpay.WeChatPayActionConfiguration
import com.adyenreactnativesdk.BuildConfig
import java.lang.ref.WeakReference
import java.util.*

class ActionHandlerConfiguration(
    val shopperLocale: Locale,
    val environment: Environment,
    val clientKey: String
)

interface ActionHandlingInterface {
    // Same signature as the Fragment Protocol interface
    fun provide(actionComponentData: ActionComponentData)
    fun onError(error: Exception)
    fun onClose()
    fun onFinish()
}

class ActionHandler(
    private val callback: ActionHandlingInterface,
    private val configuration: ActionHandlerConfiguration
) : Observer<ActionComponentData> {

    private var dialog: WeakReference<DialogFragment> = WeakReference(null)
    private var loadedComponent: BaseActionComponent<*>? = null
    private var loadedAction: Action? = null

    override fun onChanged(componentData: ActionComponentData?) {
        if (componentData != null) {
            callback.provide(componentData)
        }
    }

    fun handleAction(activity: FragmentActivity, action: Action) {
        Log.d(TAG, "handleAction - ${action.type}")
        val provider = getActionProviderFor(action)
        if (provider == null) {
            Log.e(TAG, "Unknown Action - ${action.type}")
            return
        }

        loadedAction = action

        activity.runOnUiThread {
            if (provider.requiresView(action)) {
                Log.d(
                    TAG,
                    "handleAction - action is viewable, requesting displayAction callback"
                )
                val fragmentManager = activity.supportFragmentManager

                val actionFragment = ActionComponentDialogFragment(configuration, callback)
                actionFragment.show(fragmentManager, ACTION_FRAGMENT_TAG)
                actionFragment.setToHandleWhenStarting()
                dialog = WeakReference<DialogFragment>(actionFragment)

            } else {
                Log.d(
                    TAG,
                    "handleAction - action have no view, loading component"
                )
                loadComponent(activity, provider)
                loadedComponent?.handleAction(activity, action)
            }
        }
    }

    fun hide(activity: FragmentActivity) {
        dialog.get()?.dismiss()
        dialog.clear()
        loadedComponent?.removeObservers(activity)
        loadedComponent?.removeErrorObservers(activity)
        loadedComponent = null
    }

    private fun loadComponent(
        activity: FragmentActivity,
        provider: ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>
    ) {
        getActionComponentFor(activity, provider, configuration).apply {
            loadedComponent = this
            observe(activity, this@ActionHandler)
            observeErrors(activity) { callback.onError(it.exception) }
            Log.d(TAG, "handleAction - loaded a new component - ${this::class.java.simpleName}")
        }
    }

    companion object {
        private val TAG = LogUtil.getTag()
        private var intentHandlingComponent: WeakReference<IntentHandlingComponent> =
            WeakReference(null)
        const val ACTION_FRAGMENT_TAG = "ACTION_DIALOG_FRAGMENT"
        const val REDIRECT_RESULT_SCHEME = BuildConfig.adyenRectNativeRedirectScheme + "://"

        internal fun getReturnUrl(context: Context): String {
            return REDIRECT_RESULT_SCHEME + context.packageName
        }

        @JvmStatic
        @Deprecated(
            message = "This method is deprecated",
            replaceWith = ReplaceWith("handleIntent(intent)"))
        fun handle(intent: Intent) {
            handleIntent(intent)
        }

        @JvmStatic
        fun handleIntent(intent: Intent) {
            val data = intent.data
            if (data != null && data.toString().startsWith(REDIRECT_RESULT_SCHEME))
                intentHandlingComponent.get()?.handleIntent(intent)
        }

        private inline fun <reified T : Configuration> getDefaultConfigForAction(
            configuration: ActionHandlerConfiguration
        ): T {
            val shopperLocale = configuration.shopperLocale
            val environment = configuration.environment
            val clientKey = configuration.clientKey

            // get default builder for Configuration type
            val builder: BaseConfigurationBuilder<out Configuration> = when (T::class) {
                AwaitConfiguration::class -> AwaitConfiguration.Builder(
                    shopperLocale,
                    environment,
                    clientKey
                )
                RedirectConfiguration::class -> RedirectConfiguration.Builder(
                    shopperLocale,
                    environment,
                    clientKey
                )
                QRCodeConfiguration::class -> QRCodeConfiguration.Builder(
                    shopperLocale,
                    environment,
                    clientKey
                )
                Adyen3DS2Configuration::class -> Adyen3DS2Configuration.Builder(
                    shopperLocale,
                    environment,
                    clientKey
                )
                WeChatPayActionConfiguration::class -> WeChatPayActionConfiguration.Builder(
                    shopperLocale,
                    environment,
                    clientKey
                )
                VoucherConfiguration::class -> VoucherConfiguration.Builder(
                    shopperLocale,
                    environment,
                    clientKey
                )
                else -> throw CheckoutException("Unable to find component configuration for class - ${T::class}")
            }

            @Suppress("UNCHECKED_CAST")
            return builder.build() as T
        }

        internal fun getActionProviderFor(action: Action): ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>? {
            val allActionProviders = listOf(
                RedirectComponent.PROVIDER,
                Adyen3DS2Component.PROVIDER,
                WeChatPayActionComponent.PROVIDER,
                AwaitComponent.PROVIDER,
                QRCodeComponent.PROVIDER,
                VoucherComponent.PROVIDER
            )
            return allActionProviders.firstOrNull { it.canHandleAction(action) }
        }

        internal fun getActionComponentFor(
            activity: FragmentActivity,
            provider: ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>,
            configuration: ActionHandlerConfiguration
        ): BaseActionComponent<out Configuration> {
            val actionComponent = when (provider) {
                RedirectComponent.PROVIDER -> {
                    RedirectComponent.PROVIDER.get(
                        activity,
                        activity.application,
                        getDefaultConfigForAction(configuration)
                    )
                }
                Adyen3DS2Component.PROVIDER -> {
                    Adyen3DS2Component.PROVIDER.get(
                        activity,
                        activity.application,
                        getDefaultConfigForAction(configuration)
                    )
                }
                WeChatPayActionComponent.PROVIDER -> {
                    WeChatPayActionComponent.PROVIDER.get(
                        activity,
                        activity.application,
                        getDefaultConfigForAction(configuration)
                    )
                }
                AwaitComponent.PROVIDER -> {
                    AwaitComponent.PROVIDER.get(
                        activity,
                        activity.application,
                        getDefaultConfigForAction(configuration)
                    )
                }
                QRCodeComponent.PROVIDER -> {
                    QRCodeComponent.PROVIDER.get(
                        activity,
                        activity.application,
                        getDefaultConfigForAction(configuration)
                    )
                }
                else -> {
                    throw CheckoutException("Unable to find component for provider - $provider")
                }
            }

            if (actionComponent is IntentHandlingComponent)
                intentHandlingComponent = WeakReference(actionComponent)

            return actionComponent
        }

        internal fun getViewFor(
            context: Context,
            paymentType: String
        ): ComponentView<in OutputData, ViewableComponent<*, *, *>> {
            @Suppress("UNCHECKED_CAST")
            return when (paymentType) {
                ActionTypes.AWAIT -> AwaitView(context)
                ActionTypes.QR_CODE -> QRCodeView(context)
                ActionTypes.VOUCHER -> VoucherView(context)
                else -> {
                    throw CheckoutException("Unable to find view for type - $paymentType")
                }
                // TODO check if this generic approach can be improved
            } as ComponentView<in OutputData, ViewableComponent<*, *, *>>
        }
    }
}
