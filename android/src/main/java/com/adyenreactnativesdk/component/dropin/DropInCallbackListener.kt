package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInResult
import com.adyen.checkout.dropin.SessionDropInCallback
import com.adyen.checkout.dropin.SessionDropInResult
import java.lang.ref.WeakReference

class DropInCallbackListener :
  DropInCallback,
    SessionDropInCallback {

  var callback: WeakReference<ReactDropInCallback> =
      WeakReference(null)

  override fun onDropInResult(dropInResult: DropInResult?) {
    callback.get()?.let {
      when (dropInResult) {
        is DropInResult.CancelledByUser -> it.onCancel()
        is DropInResult.Error -> it.onError(dropInResult.reason)
        is DropInResult.Finished -> it.onCompleted(dropInResult.result)
        null -> return
      }
    }
  }

  override fun onDropInResult(sessionDropInResult: SessionDropInResult?) {
    callback.get()?.let {
      when (sessionDropInResult) {
        is SessionDropInResult.CancelledByUser -> it.onCancel()
        is SessionDropInResult.Error -> it.onError(sessionDropInResult.reason)
        is SessionDropInResult.Finished -> it.onFinished(sessionDropInResult.result)
        null -> return
      }
    }
  }
}
