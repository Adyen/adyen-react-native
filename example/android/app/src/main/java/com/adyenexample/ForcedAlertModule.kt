package com.adyenexample

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import android.content.Intent
import com.facebook.react.bridge.ReactMethod
import com.adyenexample.ForcedAlertModule
import com.adyenexample.AlertDialogActivity
import com.facebook.react.bridge.Callback

class ForcedAlertModule internal constructor(context: ReactApplicationContext?) :
    ReactContextBaseJavaModule(context) {

    override fun getName(): String {
        return "ForcedAlert"
    }

    @ReactMethod
    fun alert(title: String?, message: String?, cancelCallBack: Callback?, okCallBack: Callback?) {
        onCancel = cancelCallBack
        onAgree = okCallBack
        val dialogIntent = Intent(reactApplicationContext, AlertDialogActivity::class.java)
        dialogIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        dialogIntent.putExtra("title", title)
        dialogIntent.putExtra("message", message)
        currentActivity!!.application.startActivity(dialogIntent)
    }

    companion object {
        const val CLOSE = "com.adyenexample.CLOSE"
        @JvmField
        var onCancel: Callback? = null
        @JvmField
        var onAgree: Callback? = null
    }
}