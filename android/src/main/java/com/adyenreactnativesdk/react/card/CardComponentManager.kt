package com.adyenreactnativesdk.react.card

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.PaymentMethod
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.sessions.core.CheckoutSession
import com.adyenreactnativesdk.component.base.BaseModule
import com.adyenreactnativesdk.react.CardViewManager.Companion.NAME
import com.adyenreactnativesdk.react.base.ComponentAdvancedCallback
import com.adyenreactnativesdk.react.base.ComponentSessionCallback
import com.facebook.react.uimanager.ThemedReactContext
import org.json.JSONObject
import java.util.UUID

class CardComponentManager(
  val context: ThemedReactContext,
) {
  val activity = context.currentActivity as FragmentActivity

  var component: CardComponent? = null

  fun init(
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject,
  ) {
    val session = BaseModule.Companion.session
    component =
      if (session != null) {
        createSessionCardComponent(
          context,
          activity,
          session,
          configuration,
          paymentMethodJson,
        )
      } else {
        createAdvancedCardComponent(configuration, paymentMethodJson)
      }
  }

  private fun createAdvancedCardComponent(
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject,
  ): CardComponent {
    val isStoredPaymentMethod = false
    when (isStoredPaymentMethod) {
      true -> {
        val storedPaymentMethod = StoredPaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          storedPaymentMethod = storedPaymentMethod,
          checkoutConfiguration = configuration,
          callback = ComponentAdvancedCallback(context, NAME),
          key = UUID.randomUUID().toString(),
        )
      }

      false -> {
        val paymentMethod = PaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          paymentMethod = paymentMethod,
          checkoutConfiguration = configuration,
          callback = ComponentAdvancedCallback(context, NAME),
          key = UUID.randomUUID().toString(),
        )
      }
    }
  }

  private fun createSessionCardComponent(
    context: ThemedReactContext,
    activity: FragmentActivity,
    session: CheckoutSession,
    configuration: CheckoutConfiguration,
    paymentMethodJson: JSONObject,
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
          componentCallback = ComponentSessionCallback(context, ::actionHandle, NAME),
          key = UUID.randomUUID().toString(),
        )
      }

      false -> {
        val paymentMethod = PaymentMethod.SERIALIZER.deserialize(paymentMethodJson)
        return CardComponent.PROVIDER.get(
          activity = activity,
          checkoutSession = session,
          paymentMethod = paymentMethod,
          checkoutConfiguration = configuration,
          componentCallback = ComponentSessionCallback(context, ::actionHandle, NAME),
          key = UUID.randomUUID().toString(),
        )
      }
    }
  }

  private fun actionHandle(action: Action) {
    // Check if FragmentActivity is still valid before handling action
    if (!activity.isDestroyed && !activity.isFinishing) {
      component?.handleAction(action, activity)
    }
  }
}
