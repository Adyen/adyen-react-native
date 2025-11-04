package com.adyenreactnativesdk.react.card

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.react.CardViewManager.Companion.NAME
import org.json.JSONObject
import java.util.UUID

object CardComponentFactory {

  fun build(
    activity: FragmentActivity,
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject
  ): CardComponent {
    val session = BaseModule.Companion.session
    val cardComponent =
      if (session != null) {
        createSessionCardComponent(
          activity,
          session,
          configuration,
          paymentMethodJson
        )
      } else {
        createAdvancedCardComponent(activity, configuration, paymentMethodJson)
      }
    return cardComponent
  }


  private fun createAdvancedCardComponent(
    activity: FragmentActivity,
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject
  ): CardComponent {
    val isStoredPaymentMethod = false
    when (isStoredPaymentMethod) {
      true -> {
        val storedPaymentMethod = StoredPaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          storedPaymentMethod = storedPaymentMethod,
          checkoutConfiguration = configuration,
          callback = CardAdvancedCallback(
            NAME,
          ),
          key = UUID.randomUUID().toString()
        )
      }

      false -> {
        val paymentMethod = PaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          paymentMethod = paymentMethod,
          checkoutConfiguration = configuration,
          callback =
            CardAdvancedCallback(
              NAME,
            ),
          key = UUID.randomUUID().toString()
        )
      }
    }
  }

  private fun createSessionCardComponent(
    activity: FragmentActivity,
    session: CheckoutSession,
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject
  ): CardComponent {
    val isStoredPaymentMethod = false
    when (isStoredPaymentMethod) {
      true -> {
        val storedPaymentMethod = StoredPaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          checkoutSession = session,
          storedPaymentMethod = storedPaymentMethod,
          checkoutConfiguration = configuration,
          componentCallback =
            CardSessionCallback(
              NAME,
            ),
          key = UUID.randomUUID().toString()
        )
      }

      false -> {
        val paymentMethod = PaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          checkoutSession = session,
          paymentMethod = paymentMethod,
          checkoutConfiguration = configuration,
          componentCallback =
            CardSessionCallback(
              NAME,
              ),
          key = UUID.randomUUID().toString()
        )
      }
    }
  }
}

