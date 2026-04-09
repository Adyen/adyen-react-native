package com.adyenreactnativesdk.react.card

import android.util.Log
import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.AddressLookupResult
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.react.base.ComponentAdvancedCallback
import com.adyenreactnativesdk.react.base.ComponentSessionCallback
import com.adyenreactnativesdk.util.messaging.MessageBus
import org.json.JSONObject
import java.util.UUID

class CardComponentManager(
  val activity: FragmentActivity,
  val messageBus: MessageBus,
) {
  var component: CardComponent? = null

  fun createComponent(
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject,
  ): CardComponent {
    val session = BaseModule.session
    val paymentMethod = PaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
    val component =
      if (session != null) {
        createSessionCardComponent(session, configuration, paymentMethod)
      } else {
        createAdvancedCardComponent(configuration, paymentMethod)
      }

    component.setAddressLookupCallback(
      object : AddressLookupCallback {
        override fun onQueryChanged(query: String) {
          messageBus.onQueryChanged(query)
        }

        override fun onLookupCompletion(lookupAddress: LookupAddress): Boolean = messageBus.onLookupCompletion(lookupAddress)
      },
    )
    component.setOnBinLookupListener { bin -> messageBus.onBinLookup(bin) }
    component.setOnBinValueListener { shippingAddress -> messageBus.onBinValue(shippingAddress) }
    this.component = component
    return component
  }

  private fun createAdvancedCardComponent(
    configuration: CheckoutConfiguration,
    paymentMethod: PaymentMethod,
  ): CardComponent =
    CardComponent.PROVIDER.get(
      activity = activity,
      paymentMethod = paymentMethod,
      checkoutConfiguration = configuration,
      callback = ComponentAdvancedCallback(messageBus),
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
      componentCallback = ComponentSessionCallback(messageBus, ::handleAction),
      key = UUID.randomUUID().toString(),
    )

  fun updateAddressLookupOptions(options: List<LookupAddress>) {
    component?.updateAddressLookupOptions(options)
  }

  fun setAddressLookupResult(addressLookupResult: AddressLookupResult) {
    component?.setAddressLookupResult(addressLookupResult)
  }

  fun handleAction(action: Action) {
    component?.let {
      AdyenCheckout.setComponent(it)
      it.handleAction(action, activity)
    } ?: Log.e("CardComponentManager", "Can not handle action, Component is null")
  }
}
