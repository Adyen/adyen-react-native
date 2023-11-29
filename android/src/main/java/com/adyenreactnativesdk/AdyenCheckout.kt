package com.adyenreactnativesdk

import android.content.Intent
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import com.adyen.checkout.components.core.internal.ActivityResultHandlingComponent
import com.adyen.checkout.components.core.internal.IntentHandlingComponent
import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInResult
import com.adyen.checkout.dropin.internal.ui.model.DropInResultContractParams
import com.adyenreactnativesdk.component.dropin.ReactDropInCallback
import com.adyenreactnativesdk.component.googlepay.AdyenGooglePayComponent
import com.adyenreactnativesdk.util.AdyenConstants
import java.lang.ref.WeakReference

/**
 * Umbrella class for setting DropIn and Component specific parameters
 */
object AdyenCheckout {
    private const val TAG = "AdyenCheckout"
    private var intentHandlingComponent: WeakReference<IntentHandlingComponent> = WeakReference(null)
    private var activityResultHandlingComponent: WeakReference<ActivityResultHandlingComponent> = WeakReference(null)
    private val dropInCallback = DropInCallbackListener()
    internal var dropInLauncher: ActivityResultLauncher<DropInResultContractParams>? = null


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
//        dropInLauncher = activity
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
        return if (data != null && handler != null && data.toString().startsWith(AdyenConstants.PARAMETER_RETURN_URL)) {
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
            activityResultHandlingComponent.get()?.handleActivityResult(resultCode, data)
        }
    }

    @JvmStatic
    internal fun setActivityResultHandlingComponent(component: ActivityResultHandlingComponent) {
        activityResultHandlingComponent = WeakReference(component)
    }

    @JvmStatic
    internal fun removeActivityResultHandlingComponent() {
        activityResultHandlingComponent.clear()
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