package com.adyenreactnativesdk.react.card

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.react.CardViewManager.Companion.NAME
import com.adyenreactnativesdk.react.base.ComponentAdvancedCallback
import com.adyenreactnativesdk.react.base.ComponentSessionCallback
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.uimanager.ThemedReactContext
import org.json.JSONObject
import java.util.UUID

class CardComponentManager(
  val context: ThemedReactContext,
  val messageBus: MessageBus,
) {
  val activity = context.currentActivity as FragmentActivity

  var component: CardComponent? = null

  fun init(
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject,
  ) {
    val session = BaseModule.session
    val paymentMethod = PaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
    component =
      if (session != null) {
        createSessionCardComponent(
          session,
          configuration,
          paymentMethod,
        )
      } else {
        createAdvancedCardComponent(configuration, paymentMethod)
      }

    component?.setAddressLookupCallback(
      object : AddressLookupCallback {
        override fun onQueryChanged(query: String) {
          messageBus.onQueryChanged(query)
        }

        override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean = messageBus.onLookupCompletion(lookupAddress)
      },
    )
  }

  private fun createAdvancedCardComponent(
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
  ): CardComponent =
    CardComponent.PROVIDER.get(
      activity = activity,
      paymentMethod = paymentMethod,
      checkoutConfiguration = configuration,
      callback = ComponentAdvancedCallback(messageBus, NAME),
      key = UUID.randomUUID().toString(),
    )

  private fun createSessionCardComponent(
    session: CheckoutSession,
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
  ): CardComponent =
    CardComponent.PROVIDER.get(
      activity = activity,
      checkoutSession = session,
      paymentMethod = paymentMethod,
      checkoutConfiguration = configuration,
      componentCallback = ComponentSessionCallback(messageBus, ::actionHandle, NAME),
      key = UUID.randomUUID().toString(),
    )

  fun updateAddressLookupOptions(options: List<LookupAddress>) {
    component?.updateAddressLookupOptions(options)
  }

  fun setAddressLookupResult(lookupAddress: LookupAddress) {
    component?.setAddressLookupResult(AddressLookupResult.Completed(lookupAddress))
  }

  fun failAddressLookupResult(message: String?) {
    component?.setAddressLookupResult(AddressLookupResult.Error(message))
  }

  private fun actionHandle(action: Action) {
    if (!activity.isDestroyed && !activity.isFinishing) {
      component?.handleAction(action, activity)
    }
  }
}
