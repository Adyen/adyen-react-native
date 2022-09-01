/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import androidx.fragment.app.DialogFragment
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
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.core.api.Environment
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.core.log.LogUtil
import com.adyen.checkout.core.log.Logger
import com.adyen.checkout.qrcode.QRCodeComponent
import com.adyen.checkout.qrcode.QRCodeConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.redirect.RedirectConfiguration
import com.adyen.checkout.voucher.VoucherComponent
import com.adyen.checkout.voucher.VoucherConfiguration
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

    private var dialog: DialogFragment? = null

    companion object {
        val TAG = LogUtil.getTag()
        const val ACTION_FRAGMENT_TAG = "ACTION_DIALOG_FRAGMENT"
    }

    private var loadedComponent: BaseActionComponent<*>? = null
    private var loadedAction: Action? = null

    override fun onChanged(componentData: ActionComponentData?) {
        if (componentData != null) {
            callback.provide(componentData)
        }
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
                dialog = actionFragment

            } else {
                loadComponent(activity, provider)
                loadedComponent?.handleAction(activity, action)
            }
        }
    }

    fun hide() {
        dialog?.dismiss()
    }

    private fun loadComponent(
        activity: FragmentActivity,
        provider: ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>
    ) {
        getActionComponentFor(activity, provider, configuration).apply {
            loadedComponent = this
            observe(activity, this@ActionHandler)
            observeErrors(activity) { callback.onError(it.exception) }
            Logger.d(TAG, "handleAction - loaded a new component - ${this::class.java.simpleName}")
        }
    }

    private fun getActionProviderFor(action: Action): ActionComponentProvider<out BaseActionComponent<out Configuration>, out Configuration>? {
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

    private fun getActionComponentFor(
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
            VoucherComponent.PROVIDER -> {
                VoucherComponent.PROVIDER.get(
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
}
