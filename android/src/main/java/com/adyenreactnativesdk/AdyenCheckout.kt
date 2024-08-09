/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.content.Intent
import android.util.Log
import androidx.activity.result.ActivityResultCaller
import androidx.activity.result.ActivityResultLauncher
import com.adyen.checkout.action.core.internal.ActionHandlingComponent
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.internal.ActivityResultHandlingComponent
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.dropin.DropIn
import com.adyen.checkout.dropin.DropInCallback
import com.adyen.checkout.dropin.DropInResult
import com.adyen.checkout.dropin.SessionDropInCallback
import com.adyen.checkout.dropin.SessionDropInResult
import com.adyen.checkout.dropin.internal.ui.model.DropInResultContractParams
import com.adyen.checkout.dropin.internal.ui.model.SessionDropInResultContractParams
import com.adyenreactnativesdk.component.dropin.ReactDropInCallback
import com.adyenreactnativesdk.component.googlepay.GooglePayModule
import java.lang.ref.WeakReference

/**
 * Umbrella class for setting DropIn and Component specific parameters
 */
object AdyenCheckout {
    private var currentComponent: WeakReference<Component> = WeakReference(null)
    private val dropInCallback = DropInCallbackListener()
    internal var dropInLauncher: ActivityResultLauncher<DropInResultContractParams>? = null
    internal var dropInSessionLauncher: ActivityResultLauncher<SessionDropInResultContractParams>? =
        null

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
        dropInLauncher = DropIn.registerForDropInResult(
            activity, dropInCallback as DropInCallback
        )
        dropInSessionLauncher = DropIn.registerForDropInResult(
            activity, dropInCallback as SessionDropInCallback
        )
    }

    /**
     * Allow Adyen Components to process intents.
     * @param intent  received redirect intent
     * @return  `true` when intent could be handled by AdyenCheckout
     */
    @JvmStatic
    fun handleIntent(intent: Intent): Boolean {
        if (intent.data == null) {
            return false
        }
        val actionHandlingComponent = currentComponent.get() as? ActionHandlingComponent
        return if (actionHandlingComponent != null) {
            actionHandlingComponent.handleIntent(intent)
            true
        } else {
            Log.e(TAG, "Nothing registered as ActivityResultHandling")
            false
        }
    }

    @JvmStatic
    internal fun setComponent(component: Component) {
        currentComponent = WeakReference(component)
    }

    @JvmStatic
    internal fun removeComponent() {
        currentComponent.clear()
    }

    /**
     * Allow Adyen Components to process intents.
     * @param requestCode  received redirect intent
     * @param resultCode  received redirect intent
     * @param data  received redirect intent
     */
    @JvmStatic
    fun handleActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == GooglePayModule.GOOGLEPAY_REQUEST_CODE) {
            val activityResultHandlingComponent =
                currentComponent.get() as? ActivityResultHandlingComponent
            if (activityResultHandlingComponent != null) {
                activityResultHandlingComponent.handleActivityResult(resultCode, data)
            } else {
                Log.e(TAG, "Nothing registered as ActivityResultHandling")
            }
        }
    }

    private const val TAG = "AdyenCheckout"
}

private class DropInCallbackListener : DropInCallback, SessionDropInCallback {

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