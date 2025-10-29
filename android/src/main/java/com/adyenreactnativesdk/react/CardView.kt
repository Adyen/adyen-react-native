package com.adyenreactnativesdk.react

import android.annotation.SuppressLint
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import com.google.android.gms.wallet.button.ButtonConstants
import com.google.android.gms.wallet.button.ButtonOptions
import com.google.android.gms.wallet.button.PayButton

@SuppressLint("ViewConstructor")
class CardView(
  private val context: ThemedReactContext,
) : FrameLayout(context) {
  var showButton: Boolean = false

  // private var googlePayButton: PayButton = PayButton(context)

  fun showComponent() {
    removeView(googlePayButton)
    scheduleUpdate()
    addView(googlePayButton)
  }

  private fun scheduleUpdate() {

  }
}
