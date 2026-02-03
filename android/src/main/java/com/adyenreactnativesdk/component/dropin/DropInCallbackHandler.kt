package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInResult
import com.adyen.checkout.dropin.SessionDropInCallback
import com.adyen.checkout.dropin.SessionDropInResult
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
      null -> return
    }
  }

  override fun onDropInResult(sessionDropInResult: SessionDropInResult?) {
    val messageBus = getMessageBus() ?: return
    when (sessionDropInResult) {
      is SessionDropInResult.CancelledByUser -> messageBus.onSessionException(ModuleException.Canceled())
      is SessionDropInResult.Error -> messageBus.onSessionException(ModuleException.Unknown(sessionDropInResult.reason))
      is SessionDropInResult.Finished -> messageBus.onFinished(sessionDropInResult.result)
      null -> return
    }
  }
}
