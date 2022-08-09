package com.adyenexample

import com.facebook.react.ReactActivity
import com.adyenexample.MainActivity.FirstReceiver
import android.os.Bundle
import android.content.IntentFilter
import com.adyenexample.ForcedAlertModule
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class MainActivity : ReactActivity() {
    private var firstReceiver: FirstReceiver? = null

    /**
     * Returns the name of the main component registered from JavaScript. This is used to schedule
     * rendering of the component.
     */
    override fun getMainComponentName(): String? {
        return "AdyenExample"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val filter = IntentFilter(ForcedAlertModule.CLOSE)
        firstReceiver = FirstReceiver()
        registerReceiver(firstReceiver, filter)
    }

    internal inner class FirstReceiver : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (intent.action == ForcedAlertModule.CLOSE) {
                if (intent.getBooleanExtra("agree", false)) {
                    ForcedAlertModule.onAgree?.invoke()
                } else {
                    ForcedAlertModule.onCancel?.invoke()
                }
            }
        }
    }
}