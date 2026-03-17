package com.adyenreactnativesdk.react.base

import android.annotation.SuppressLint
import android.content.Context
import android.util.Size
import android.view.ViewTreeObserver
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import com.adyen.checkout.components.core.internal.Component
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyen.checkout.ui.core.internal.ui.ViewableComponent

private const val TIMEOUT = 1000L

class DynamicComponentView(
  context: Context,
) : FrameLayout(context) {
  private val screenDensity = resources.displayMetrics.density
  private var ignoreLayoutChanges = false
  private var interactionBlocked = false
  var layoutListener: LayoutListener? = null
  var hasComponent = false
  var globalListener: ViewTreeObserver.OnGlobalLayoutListener? = null

  private val resizeRunnable =
    object : Runnable {
      override fun run() {
        measure(
          MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
          MeasureSpec.UNSPECIFIED,
        )
        val size =
          Size(
            (measuredWidth / screenDensity).toInt(),
            (measuredHeight / screenDensity).toInt(),
          )
        layoutListener?.onLayoutSizeUpdate(size)
        postDelayed(this, TIMEOUT)
      }
    }

  @SuppressLint("RestrictedApi")
  fun <T> addComponent(
    component: T,
    activity: ComponentActivity,
  ) where T : Component, T : ViewableComponent {
    val adyenComponentView =
      AdyenComponentView(context).apply {
        attach(component, activity)
      }

    hasComponent = true
    addView(adyenComponentView)
    postDelayed(resizeRunnable, TIMEOUT)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // Ensure cleanup when view is detached to prevent Fragment lifecycle issues
    onDispose()
  }

  fun onDispose() {
    // Clean up any child views to prevent Fragment lifecycle issues
    removeAllViews()
    ignoreLayoutChanges = false
    interactionBlocked = false
    globalListener?.let { getViewTreeObserver()?.removeOnGlobalLayoutListener(it) }
    globalListener = null
  }
}

interface LayoutListener {
  fun onLayoutSizeUpdate(size: Size)
}
