package com.adyenreactnativesdk.react.base

import android.content.Context
import android.util.AttributeSet
import android.util.Size
import android.view.ViewGroup
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.core.view.children
import androidx.core.view.postDelayed
import com.adyen.checkout.card.CardComponent
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyen.checkout.ui.core.internal.ui.ViewableComponent
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputLayout

class DynamicComponentView
@JvmOverloads
constructor(
  context: Context,
  attrs: AttributeSet? = null,
  defStyle: Int = 0,
) : FrameLayout(context) {
  private val screenDensity = resources.displayMetrics.density
  private var activity: ComponentActivity? = null
  private var ignoreLayoutChanges = false
  private var interactionBlocked = false
  var layoutListener: LayoutListener? = null
  var hasComponent = false

  // Usage of complete component height also when having error hints
  override fun onMeasure(
    widthMeasureSpec: Int,
    heightMeasureSpec: Int
  ) {
    val heightSize = MeasureSpec.getSize(heightMeasureSpec)
    super.onMeasure(widthMeasureSpec, heightSize)
  }

  override fun onLayout(
    changed: Boolean,
    l: Int,
    t: Int,
    r: Int,
    b: Int
  ) {
    super.onLayout(changed, l, t, r, b)

    if (changed && !ignoreLayoutChanges) {
      resizeViewport(calculateViewportHeight(), calculateViewportWidth())
    }
  }

  fun <T> addComponent(
    component: T,
    activity: ComponentActivity,
  ) where T : Component, T : ViewableComponent {
    val adyenComponentView =
      AdyenComponentView(context).apply {
        onComponentViewGlobalLayout(this, component)
        attach(component, activity)
      }

    hasComponent = true
    addView(adyenComponentView)
  }

  fun onDispose() {
    activity = null
    ignoreLayoutChanges = false
    interactionBlocked = false
  }

  private fun <T> onComponentViewGlobalLayout(
    adyenComponentView: AdyenComponentView,
    component: T
  ) where T : Component, T : ViewableComponent {
    adyenComponentView.getViewTreeObserver()?.addOnGlobalLayoutListener(
      object : ViewTreeObserver.OnGlobalLayoutListener {
        override fun onGlobalLayout() {
          if (component is CardComponent) {
            overrideSubmit(component)
          }

          adyenComponentView.getViewTreeObserver()?.removeOnGlobalLayoutListener(this)
        }
      }
    )
  }

  private fun overrideSubmit(component: CardComponent) {
    val payButton = findViewById<MaterialButton>(com.adyen.checkout.ui.core.R.id.payButton)
    if (android.os.Build.VERSION.SDK_INT <= android.os.Build.VERSION_CODES.O) {
      disableRippleAnimationOnPayButton()
      disableRippleAnimationOnStorePaymentMethodSwitch()
    }

    payButton?.setOnClickListener {
      isHintAnimationEnabledOnTextInputFields(this, false)
      ignoreLayoutChanges = true
      if (!interactionBlocked) {
        interactionBlocked = true
        component.submit()
      }
      resetInteractionBlocked()
      postDelayed(100) {
        resizeViewport(calculateViewportHeight(), calculateViewportWidth())
      }
      postDelayed(500) {
        ignoreLayoutChanges = false
        isHintAnimationEnabledOnTextInputFields(this, true)
      }
    }
  }

  // This is necessary because the RippleAnimation leads to an crash on older Android devices: https://github.com/Adyen/adyen-flutter/issues/335
  private fun disableRippleAnimationOnPayButton() {
    // TODO: check if relevant
  }

  // This is necessary because the RippleAnimation leads to an crash on older Android devices: https://github.com/Adyen/adyen-flutter/issues/335
  private fun disableRippleAnimationOnStorePaymentMethodSwitch() {
    // TODO: check if relevant
  }

  private fun calculateViewportHeight(): Int {
    val componentViewHeightScreenDensity = measuredHeight / screenDensity
    return componentViewHeightScreenDensity.toInt()
  }

  private fun calculateViewportWidth(): Int {
    val componentViewHeightScreenDensity = measuredWidth / screenDensity
    return componentViewHeightScreenDensity.toInt()
  }

  private fun resizeViewport(viewportHeight: Int, viewportWidth: Int) {
    layoutListener?.onLayoutSizeUpdate(Size(viewportWidth, viewportHeight))
  }

  private fun isHintAnimationEnabledOnTextInputFields(
    viewGroup: ViewGroup,
    enabled: Boolean
  ) {
    viewGroup.children.forEach { child ->
      when (child) {
        is TextInputLayout -> child.isHintAnimationEnabled = enabled
        !is ViewGroup -> Unit
        else -> isHintAnimationEnabledOnTextInputFields(child, enabled)
      }
    }
  }

  // TODO - We can use cardComponent.setInteractionBlocked() when the fix for releasing the blocked interaction is available in then native SDK
  private fun resetInteractionBlocked() {
    postDelayed(1000) {
      interactionBlocked = false
    }
  }
}

interface LayoutListener {
  fun onLayoutSizeUpdate(size: Size)
}
