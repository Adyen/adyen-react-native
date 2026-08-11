package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.dropin.old.DropInCallback
import com.adyen.checkout.dropin.old.DropInResult
import com.adyen.checkout.dropin.old.SessionDropInCallback
import com.adyen.checkout.dropin.old.SessionDropInResult
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.messaging.MessageBus

class DropInCallbackHandler(
  private val messageBusProvider: () -> MessageBus?,
) : DropInCallback,
  SessionDropInCallback {
  private fun getMessageBus(): MessageBus? = runCatching { messageBusProvider() }.getOrNull()

  override fun onDropInResult(dropInResult: DropInResult?) {
    val messageBus = getMessageBus() ?: return
    when (dropInResult) {
      is DropInResult.CancelledByUser -> messageBus.onException(ModuleException.Canceled())
      is DropInResult.Error -> messageBus.onException(ModuleException.Unknown(dropInResult.reason))
      is DropInResult.Finished -> messageBus.onFinished()
      null -> messageBus.onException(ModuleException.Unknown("DropIn result is null"))
    }
  }

  override fun onDropInResult(sessionDropInResult: SessionDropInResult?) {
    val messageBus = getMessageBus() ?: return
    when (sessionDropInResult) {
      is SessionDropInResult.CancelledByUser -> messageBus.onSessionException(ModuleException.Canceled())
      is SessionDropInResult.Error -> messageBus.onSessionException(ModuleException.Unknown(sessionDropInResult.reason))
      is SessionDropInResult.Finished -> {
        // TODO: v6 migration - convert old SessionPaymentResult to v6 SessionCheckoutResult
        val oldResult = sessionDropInResult.result
        val v6Result =
          com.adyen.checkout.core.components.SessionCheckoutResult(
            resultCode = com.adyen.checkout.core.common.CheckoutResultCode(oldResult.resultCode ?: ""),
            sessionId = oldResult.sessionId ?: "",
            sessionData = oldResult.sessionData ?: "",
          )
        messageBus.onFinished(v6Result)
      }
      null -> messageBus.onSessionException(ModuleException.Unknown("DropIn result is null"))
    }
  }
}
