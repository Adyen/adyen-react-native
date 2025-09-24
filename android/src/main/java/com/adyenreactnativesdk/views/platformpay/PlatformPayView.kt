package com.adyenreactnativesdk.views.platformpay

import android.annotation.SuppressLint
import android.widget.FrameLayout
import com.facebook.react.uimanager.ThemedReactContext
import com.google.android.gms.wallet.button.ButtonConstants
import com.google.android.gms.wallet.button.ButtonOptions
import com.google.android.gms.wallet.button.PayButton


enum class ButtonTheme(val value: Int) {
  Dark(ButtonConstants.ButtonTheme.DARK),
  Light(ButtonConstants.ButtonTheme.LIGHT);

  companion object {
    fun fromInt(value: Int): ButtonTheme = ButtonTheme.entries.find { it.value == value } ?: Dark
  }
}

enum class ButtonType(val value: Int) {
  Book(ButtonConstants.ButtonType.BOOK),
  Buy(ButtonConstants.ButtonType.BUY),
  Checkout(ButtonConstants.ButtonType.CHECKOUT),
  Donate(ButtonConstants.ButtonType.DONATE),
  Order(ButtonConstants.ButtonType.ORDER),
  Pay(ButtonConstants.ButtonType.PAY),
  Plain(ButtonConstants.ButtonType.PLAIN),
  Subscribe(ButtonConstants.ButtonType.SUBSCRIBE);

  companion object {
    fun fromInt(value: Int): ButtonType = entries.find { it.value == value } ?: Buy
  }
}

@SuppressLint("ViewConstructor")
class PlatformPayView(private val context: ThemedReactContext) : FrameLayout(context) {

  lateinit var onClick: () -> Unit
  var theme: ButtonTheme = ButtonTheme.Dark
  var type: ButtonType = ButtonType.Buy
  var radius: Int = 50

  private var googlePayButton: PayButton = PayButton(context)

  fun showButton() {
    scheduleUpdate()
    addView(googlePayButton)
    viewTreeObserver.addOnGlobalLayoutListener { requestLayout() }
  }

  private fun scheduleUpdate() {
    googlePayButton = PayButton(context).apply {
      initialize(
        ButtonOptions.newBuilder()
          .setButtonType(type.value)
          .setButtonTheme(theme.value)
          .setCornerRadius(radius)
          .setAllowedPaymentMethods(allowedPaymentMethods)
          .build()
      )
      setOnClickListener {
        onClick.invoke()
      }
    }
  }

  override fun requestLayout() {
    super.requestLayout()
    post {
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
      )
      layout(left, top, right, bottom)
    }
  }

  companion object {
    private val allowedPaymentMethods: String = """
           [
             {
               "type": "CARD",
               "parameters": {
                 "allowedAuthMethods": ["PAN_ONLY", "CRYPTOGRAM_3DS"],
                 "allowedCardNetworks": ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"]
               }
             }
           ]
       """.trimIndent()
  }
}
