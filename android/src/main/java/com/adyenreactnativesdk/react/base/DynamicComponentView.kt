package com.adyenreactnativesdk.react.base

import android.annotation.SuppressLint
import android.content.Context
import android.util.Size
import android.view.View
import android.widget.FrameLayout

private const val TIMEOUT = 250L

class DynamicComponentView(
  context: Context,
) : FrameLayout(context) {
  private val screenDensity = resources.displayMetrics.density
  private var oldSize: Size? = null

  var layoutListener: LayoutListener? = null
  var isViewSet = false

  private val resizeRunnable =
    object : Runnable {
      override fun run() {
        measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.UNSPECIFIED)
        val size = Size((measuredWidth / screenDensity).toInt(), (measuredHeight / screenDensity).toInt())
        if (oldSize != size) {
          oldSize = size
          layoutListener?.onLayoutSizeUpdate(id, size)
        }
        postDelayed(this, TIMEOUT)
      }
    }

  override fun requestLayout() {
    super.requestLayout()
    post {
      measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
      layout(left, top, right, bottom)
    }
  }

  @SuppressLint("RestrictedApi")
  fun setView(view: View) {
    isViewSet = true
    addView(view)
    postDelayed(resizeRunnable, TIMEOUT)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    // Do NOT call removeAllViews() here: ViewGroup.dispatchDetachedFromWindow() already
    // cascades to every child (detaching the Compose-backed child view) before calling this
    // method, so the child is already detached by the time we get here. Calling
    // removeAllViews() would detach it a second time, racing Compose's own
    // accessibility-delegate teardown and crashing with a NullPointerException. Only clear our
    // own bookkeeping; the (already-detached) child gets garbage collected with this view.
    removeCallbacks(resizeRunnable)
    isViewSet = false
    oldSize = null
  }

  /** Explicit disposal from [com.adyenreactnativesdk.react.AdyenComponentViewManager.onDropViewInstance]. */
  fun onDispose() {
    removeCallbacks(resizeRunnable)
    if (isViewSet) {
      removeAllViews()
    }
    isViewSet = false
    oldSize = null
  }
}

fun interface LayoutListener {
  fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  )
}
