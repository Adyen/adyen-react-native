package com.adyenreact

import android.content.Context
import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.Observer
import com.adyen.checkout.adyen3ds2.Adyen3DS2Component
import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration
import com.adyen.checkout.await.AwaitComponent
import com.adyen.checkout.await.AwaitConfiguration
import com.adyen.checkout.await.AwaitView
import com.adyen.checkout.bcmc.BcmcView
import com.adyen.checkout.blik.BlikView
import com.adyen.checkout.card.CardView
import com.adyen.checkout.components.*
import com.adyen.checkout.components.base.BaseActionComponent
import com.adyen.checkout.components.base.BaseConfigurationBuilder
import com.adyen.checkout.components.base.Configuration
import com.adyen.checkout.components.base.OutputData
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.components.util.ActionTypes
import com.adyen.checkout.components.util.PaymentMethodTypes
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.core.exception.ComponentException
import com.adyen.checkout.core.log.LogUtil
import com.adyen.checkout.core.log.Logger
import com.adyen.checkout.dotpay.DotpayRecyclerView
import com.adyen.checkout.dropin.databinding.FragmentActionComponentBinding
import com.adyen.checkout.entercash.EntercashRecyclerView
import com.adyen.checkout.eps.EPSRecyclerView
import com.adyen.checkout.ideal.IdealRecyclerView
import com.adyen.checkout.mbway.MBWayView
import com.adyen.checkout.molpay.MolpayRecyclerView
import com.adyen.checkout.openbanking.OpenBankingRecyclerView
import com.adyen.checkout.qrcode.QRCodeView
import com.adyen.checkout.sepa.SepaView
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.adyen.checkout.qrcode.QRCodeComponent
import com.adyen.checkout.qrcode.QRCodeConfiguration
import com.adyen.checkout.redirect.RedirectComponent
import com.adyen.checkout.redirect.RedirectConfiguration
import com.adyen.checkout.wechatpay.WeChatPayActionComponent
import com.adyen.checkout.wechatpay.WeChatPayActionConfiguration

class ActionComponentDialogFragment(val configuration: ActionHandlerConfiguration,
                                    val callback: ActionHandlingInterface) : BottomSheetDialogFragment(), Observer<ActionComponentData> {

    companion object {
        private val TAG = LogUtil.getTag()
        const val ACTION = "ACTION"
    }

    private lateinit var binding: FragmentActionComponentBinding
    private lateinit var action: Action
    private lateinit var actionType: String
    private lateinit var componentView: ComponentView<in OutputData, ViewableComponent<*, *, ActionComponentData>>
    private lateinit var actionComponent: ViewableComponent<*, *, ActionComponentData>
    private var isHandled = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Logger.d(TAG, "onCreate")
        action = arguments?.getParcelable(ACTION) ?: throw IllegalArgumentException("Action not found")
        actionType = action.type ?: throw IllegalArgumentException("Action type not found")
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        binding = FragmentActionComponentBinding.inflate(inflater)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Logger.d(TAG, "onViewCreated")
        binding.header.visibility = View.GONE

        try {
            @Suppress("UNCHECKED_CAST")
            componentView = getViewFor(
                requireContext(),
                actionType
            ) as ComponentView<in OutputData, ViewableComponent<*, *, ActionComponentData>>
            actionComponent = getComponent(action)
            attachComponent(actionComponent, componentView)

            if (shouldFinishWithAction()) {
                with(binding.buttonFinish) {
//                    isVisible = true
                    setOnClickListener { callback.onFinish() }
                }
            }

            if (!isHandled) {
                (actionComponent as ActionComponent<*>).handleAction(requireActivity(), action)
                isHandled = true
            } else {
                Logger.d(TAG, "action already handled")
            }
        } catch (e: CheckoutException) {
            handleError(ComponentError(e))
        }
    }

    override fun onCancel(dialog: DialogInterface) {
        super.onCancel(dialog)
        Logger.d(TAG, "onCancel")
        callback.onClose()
    }

    override fun onChanged(actionComponentData: ActionComponentData?) {
        Logger.d(TAG, "onChanged")
        if (actionComponentData != null) {
            callback.provide(actionComponentData)
        }
    }

    fun setToHandleWhenStarting() {
        Logger.d(TAG, "setToHandleWhenStarting")
        isHandled = false
    }

    /**
     * Return the possible viewable action components
     */
    @SuppressWarnings("ThrowsCount")
    private fun getComponent(action: Action): ViewableComponent<*, *, ActionComponentData> {
        val provider = getActionProviderFor(action) ?: throw ComponentException("Unexpected Action component type - $actionType")
        if (!provider.requiresView(action)) {
            throw ComponentException("Action is not viewable - action: ${action.type} - paymentMethod: ${action.paymentMethodType}")
        }
        val component = getActionComponentFor(requireActivity(), provider, configuration)
        if (!component.canHandleAction(action)) {
            throw ComponentException("Unexpected Action component type - action: ${action.type} - paymentMethod: ${action.paymentMethodType}")
        }

        @Suppress("UNCHECKED_CAST")
        return component as ViewableComponent<*, *, ActionComponentData>
    }

    private fun attachComponent(
        component: ViewableComponent<*, *, ActionComponentData>,
        componentView: ComponentView<in OutputData, ViewableComponent<*, *, ActionComponentData>>
    ) {
        component.observe(viewLifecycleOwner, this)
        component.observeErrors(viewLifecycleOwner, createErrorHandlerObserver())
        binding.componentContainer.addView(componentView as View)
        @Suppress("UNCHECKED_CAST")
        componentView.attach(component, viewLifecycleOwner)
    }

    private fun createErrorHandlerObserver(): Observer<ComponentError> {
        return Observer {
            if (it != null) {
                handleError(it)
            }
        }
    }

    private fun handleError(componentError: ComponentError) {
        Logger.e(TAG, componentError.errorMessage)
        callback.onError(componentError.exception)
    }

    private fun shouldFinishWithAction(): Boolean {
        return getActionProviderFor(action)?.providesDetails() == false
    }

    internal fun getViewFor(
        context: Context,
        paymentType: String
    ): ComponentView<in OutputData, ViewableComponent<*, *, *>> {
        @Suppress("UNCHECKED_CAST")
        return when (paymentType) {
            PaymentMethodTypes.BCMC -> BcmcView(context)
            PaymentMethodTypes.DOTPAY -> DotpayRecyclerView(context)
            PaymentMethodTypes.ENTERCASH -> EntercashRecyclerView(context)
            PaymentMethodTypes.EPS -> EPSRecyclerView(context)
            PaymentMethodTypes.IDEAL -> IdealRecyclerView(context)
            PaymentMethodTypes.MB_WAY -> MBWayView(context)
            PaymentMethodTypes.MOLPAY_THAILAND,
            PaymentMethodTypes.MOLPAY_MALAYSIA,
            PaymentMethodTypes.MOLPAY_VIETNAM -> MolpayRecyclerView(context)
            PaymentMethodTypes.OPEN_BANKING -> OpenBankingRecyclerView(context)
            PaymentMethodTypes.SCHEME -> CardView(context)
            PaymentMethodTypes.SEPA -> SepaView(context)
            PaymentMethodTypes.BLIK -> BlikView(context)
            // GooglePay and WeChatPay do not require a View in Drop-in
            ActionTypes.AWAIT -> AwaitView(context)
            ActionTypes.QR_CODE -> QRCodeView(context)
            else -> {
                throw CheckoutException("Unable to find view for type - $paymentType")
            }
            // TODO check if this generic approach can be improved
        } as ComponentView<in OutputData, ViewableComponent<*, *, *>>
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
                RedirectComponent.PROVIDER.get(activity, activity.application, getDefaultConfigForAction(configuration))
            }
            Adyen3DS2Component.PROVIDER -> {
                Adyen3DS2Component.PROVIDER.get(activity, activity.application, getDefaultConfigForAction(configuration))
            }
            WeChatPayActionComponent.PROVIDER -> {
                WeChatPayActionComponent.PROVIDER.get(activity, activity.application, getDefaultConfigForAction(configuration))
            }
            AwaitComponent.PROVIDER -> {
                AwaitComponent.PROVIDER.get(activity, activity.application, getDefaultConfigForAction(configuration))
            }
            QRCodeComponent.PROVIDER -> {
                QRCodeComponent.PROVIDER.get(activity, activity.application, getDefaultConfigForAction(configuration))
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
            AwaitConfiguration::class -> AwaitConfiguration.Builder(shopperLocale, environment, clientKey)
            RedirectConfiguration::class -> RedirectConfiguration.Builder(shopperLocale, environment, clientKey)
            QRCodeConfiguration::class -> QRCodeConfiguration.Builder(shopperLocale, environment, clientKey)
            Adyen3DS2Configuration::class -> Adyen3DS2Configuration.Builder(shopperLocale, environment, clientKey)
            WeChatPayActionConfiguration::class -> WeChatPayActionConfiguration.Builder(shopperLocale, environment, clientKey)
            else -> throw CheckoutException("Unable to find component configuration for class - ${T::class}")
        }

        @Suppress("UNCHECKED_CAST")
        return builder.build() as T
    }
}