package com.adyenreactnativesdk

import android.content.Context
import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import com.adyen.checkout.components.base.IntentHandlingComponent
import com.adyen.checkout.dropin.DropIn
import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInResult
import com.adyenreactnativesdk.action.ActionHandler
import com.adyenreactnativesdk.component.dropin.ReactDropInCallback
import com.adyenreactnativesdk.component.googlepay.AdyenGooglePayComponent
import java.lang.ref.WeakReference

/**
 * Umbrella class for setting DropIn and Component specific parameters
 */
class AdyenCheckout {

    companion object {
        private const val TAG = "AdyenCheckout"
        internal var dropInLauncher: ActivityResultLauncher<Intent>? = null
        private val dropInCallback = DropInCallbackListener()
        private var intentHandlingComponent: WeakReference<IntentHandlingComponent> = WeakReference(null)
        private var googleComponent: WeakReference<AdyenGooglePayComponent> = WeakReference(null)

        @JvmStatic
        internal fun addDropInListener(callback: ReactDropInCallback) {
            dropInCallback.callback = WeakReference(callback)
        }

        @JvmStatic
        internal fun removeDropInListener() {
            dropInCallback.callback.clear()
        }

        /**
         * Persist a reference to Activity that will present DropIn or Component
         * @param activity  parent activity for DropIn or Component
         */
        @JvmStatic
        fun setLauncherActivity(activity: ActivityResultCaller) {
            dropInLauncher = activity.registerForActivityResult(
                    ReactDropInResultContract(),
                    dropInCallback::onDropInResult
            )
        }

        /**
         * Release a reference to current Activity that presenting DropIn or Component
         */
        @JvmStatic
        fun removeLauncherActivity() {
            dropInLauncher = null
        }

        /**
         * Allow Adyen Components to process intents.
         * @param intent  received redirect intent
         * @return  `true` when intent could be handled by AdyenCheckout
         */
        @JvmStatic
        fun handleIntent(intent: Intent): Boolean {
            val data = intent.data
            val handler = intentHandlingComponent.get()
            return if (data != null && handler != null && data.toString().startsWith(ActionHandler.REDIRECT_RESULT_SCHEME)) {
                handler.handleIntent(intent)
                true
            } else false
        }

        @JvmStatic
        internal fun setIntentHandler(component: IntentHandlingComponent) {
            intentHandlingComponent = WeakReference(component)
        }

        @JvmStatic
        internal fun removeIntentHandler() {
            intentHandlingComponent.clear()
        }

        /**
         * Allow Adyen Components to process intents.
         * @param requestCode  received redirect intent
         * @param resultCode  received redirect intent
         * @param data  received redirect intent
         */
        @JvmStatic
        fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode == AdyenGooglePayComponent.GOOGLEPAY_REQUEST_CODE) {
                googleComponent.get()?.handleActivityResult(resultCode, data)
            }
        }

        @JvmStatic
        internal fun setGooglePayComponent(component: AdyenGooglePayComponent) {
            googleComponent = WeakReference(component)
        }

        @JvmStatic
        internal fun removeGooglePayComponent() {
            googleComponent.clear()
        }

    }

}

private class ReactDropInResultContract : ActivityResultContract<Intent, DropInResult?>() {
    override fun createIntent(context: Context, input: Intent): Intent {
        return input
    }

    override fun parseResult(resultCode: Int, intent: Intent?): DropInResult? {
        return DropIn.handleActivityResult(DropIn.DROP_IN_REQUEST_CODE, resultCode, intent)
    }
}

private class DropInCallbackListener : DropInCallback {

    internal var callback: WeakReference<ReactDropInCallback> =
            WeakReference(null)

    override fun onDropInResult(dropInResult: DropInResult?) {
        if (dropInResult == null ) return
        val callback = callback.get()?.let {
            when (dropInResult) {
                is DropInResult.CancelledByUser -> it.onCancel()
                is DropInResult.Error -> it.onError(dropInResult.reason)
                is DropInResult.Finished -> it.onCompleted(dropInResult.result)
            }
        }
    }
}