/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.content.Intent
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Observer
import com.adyen.checkout.adyen3ds2.Adyen3DS2Component
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.await.AwaitComponent
import com.adyen.checkout.await.AwaitConfiguration
import com.adyen.checkout.components.ActionComponentData
import com.adyen.checkout.components.ActionComponentProvider
import com.adyen.checkout.components.base.BaseActionComponent
import com.adyen.checkout.components.base.BaseConfigurationBuilder
import com.adyen.checkout.components.base.Configuration
import com.adyen.checkout.components.base.IntentHandlingComponent
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.core.api.Environment
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.core.log.LogUtil
import com.adyen.checkout.core.log.Logger
import com.adyen.checkout.qrcode.QRCodeComponent
import com.adyen.checkout.qrcode.QRCodeConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.redirect.RedirectConfiguration
import com.adyen.checkout.wechatpay.WeChatPayActionComponent
import com.adyen.checkout.wechatpay.WeChatPayActionConfiguration
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

    companion object {
        val TAG = LogUtil.getTag()
        const val UNKNOWN_ACTION = "UNKNOWN ACTION"
        const val ACTION_FRAGMENT_TAG = "ACTION_DIALOG_FRAGMENT"
        private const val BUNDLE_ACTION = "bundle_action"
    }

    private var loadedComponent: BaseActionComponent<*>? = null
    private var loadedAction: Action? = null

    override fun onChanged(componentData: ActionComponentData?) {
        if (componentData != null) {
            callback.provide(componentData)
        }
    }

    fun saveState(bundle: Bundle?) {
        bundle?.putParcelable(BUNDLE_ACTION, loadedAction)
    }

    fun restoreState(activity: FragmentActivity, bundle: Bundle?) {
        loadedAction = bundle?.getParcelable(BUNDLE_ACTION)
        loadComponent(activity, loadedAction)
    }

    @SuppressWarnings("ReturnCount")
    private fun loadComponent(activity: FragmentActivity, action: Action?) {
        if (action == null) return
        val provider = getActionProviderFor(action) ?: return
        if (provider.requiresView(action)) return
        loadComponent(activity, provider)
    }

    fun handleAction(activity: FragmentActivity, action: Action) {
        Logger.d(TAG, "handleAction - ${action.type}")
        val provider = getActionProviderFor(action)
        if (provider == null) {
            Logger.e(TAG, "Unknown Action - ${action.type}")
            return
        }

        loadedAction = action

        activity.runOnUiThread {
            if (provider.requiresView(action)) {
                Logger.d(
                    TAG,
                    "handleAction - action is viewable, requesting displayAction callback"
                )
                val fragmentManager = activity.supportFragmentManager

                val actionFragment = ActionComponentDialogFragment(configuration, callback)
                actionFragment.show(fragmentManager, ACTION_FRAGMENT_TAG)
                actionFragment.setToHandleWhenStarting()
            } else {
                loadComponent(activity, provider)
                loadedComponent?.handleAction(activity, action)
            }
        }
    }

    private fun loadComponent(
        activity: FragmentActivity,
        provider: ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>
    ) {
        getActionComponentFor(activity, provider, configuration).apply {
            loadedComponent = this
            observe(activity, this@ActionHandler)
            observeErrors(activity, { callback.onError(it.exception) })
            Logger.d(TAG, "handleAction - loaded a new component - ${this::class.java.simpleName}")
        }
    }

    fun handleRedirectResponse(intent: Intent) {
        handleIntent(intent)
    }

    fun handleWeChatPayResponse(intent: Intent) {
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent) {
        val component = loadedComponent ?: throw CheckoutException("Action component is not loaded")
        Logger.d(TAG, "handleAction - loaded component type: ${component::class.java.simpleName}")
        if (component !is IntentHandlingComponent) throw CheckoutException("Loaded component cannot handle intents")
        component.handleIntent(intent)
    }

    internal fun getActionProviderFor(action: Action): ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>? {
        val allActionProviders = listOf(
            RedirectComponent.PROVIDER,
            Adyen3DS2Component.PROVIDER,
            WeChatPayActionComponent.PROVIDER,
            AwaitComponent.PROVIDER,
            QRCodeComponent.PROVIDER
        )
        return allActionProviders.firstOrNull { it.canHandleAction(action) }
    }

    internal fun getActionComponentFor(
        activity: FragmentActivity,
        provider: ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>,
        configuration: ActionHandlerConfiguration
    ): BaseActionComponent<out Configuration> {
        return when (provider) {
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
    }

    internal inline fun <reified T : Configuration> getDefaultConfigForAction(
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
            else -> throw CheckoutException("Unable to find component configuration for class - ${T::class}")
        }

        @Suppress("UNCHECKED_CAST")
        return builder.build() as T
    }
}
