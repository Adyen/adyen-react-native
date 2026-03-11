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

    override fun onMeasure(
      widthMeasureSpec: Int,
      heightMeasureSpec: Int,
    ) {
      val heightSize = MeasureSpec.getSize(heightMeasureSpec)
      super.onMeasure(widthMeasureSpec, heightSize)
    }

    override fun onLayout(
      changed: Boolean,
      l: Int,
      t: Int,
      r: Int,
      b: Int,
    ) {
      super.onLayout(changed, l, t, r, b)

      if (changed && !ignoreLayoutChanges) {
        resizeViewport(measuredHeight, measuredWidth)
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
      // Clean up any child views to prevent Fragment lifecycle issues
      removeAllViews()
      activity = null
      ignoreLayoutChanges = false
      interactionBlocked = false
      hasComponent = false
    }

    override fun onDetachedFromWindow() {
      super.onDetachedFromWindow()
      // Ensure cleanup when view is detached to prevent Fragment lifecycle issues
      onDispose()
    }

    private fun <T> onComponentViewGlobalLayout(
      adyenComponentView: AdyenComponentView,
      component: T,
    ) where T : Component, T : ViewableComponent {
      adyenComponentView.getViewTreeObserver()?.addOnGlobalLayoutListener(
        object : ViewTreeObserver.OnGlobalLayoutListener {
          private var submitOverridden = false

          override fun onGlobalLayout() {
            if (!submitOverridden && component is CardComponent) {
              overrideSubmit(component)
              submitOverridden = true
            }
            resizeViewport(
              adyenComponentView.measuredHeight + 5,
              measuredWidth,
            )
          }
        },
      )
    }

    private fun overrideSubmit(component: CardComponent) {
      val payButton = findViewById<MaterialButton>(com.adyen.checkout.ui.core.R.id.payButton)

      payButton?.setOnClickListener {
        isHintAnimationEnabledOnTextInputFields(this, false)
        ignoreLayoutChanges = true
        if (!interactionBlocked) {
          interactionBlocked = true
          component.submit()
        }
        postDelayed(1000) {
          interactionBlocked = false
        }
        postDelayed(100) {
          resizeViewport(measuredHeight, measuredWidth)
        }
        postDelayed(500) {
          ignoreLayoutChanges = false
          isHintAnimationEnabledOnTextInputFields(this, true)
        }
      }
    }

    private fun calculateMeasurement(value: Int): Int {
      val valueWithDensity = value / screenDensity
      return valueWithDensity.toInt()
    }

    private fun resizeViewport(
      height: Int,
      width: Int,
    ) {
      val viewportWidth = calculateMeasurement(width)
      val viewportHeight = calculateMeasurement(height)
      layoutListener?.onLayoutSizeUpdate(Size(viewportWidth, viewportHeight))
    }

    private fun isHintAnimationEnabledOnTextInputFields(
      viewGroup: ViewGroup,
      enabled: Boolean,
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
  }

interface LayoutListener {
  fun onLayoutSizeUpdate(size: Size)
}
