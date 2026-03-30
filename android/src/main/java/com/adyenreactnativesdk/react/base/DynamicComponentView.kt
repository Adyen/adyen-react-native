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
  var layoutListener: LayoutListener? = null
  var viewSet = false
  private var oldSize: Size? = null
  private val resizeRunnable =
    object : Runnable {
      override fun run() {
        measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.UNSPECIFIED)
        val size = Size((measuredWidth / screenDensity).toInt(), (measuredHeight / screenDensity).toInt())
        if (oldSize != size) {
          layoutListener?.onLayoutSizeUpdate(size)
        }
        oldSize = size
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
    viewSet = true
    addView(view)
    postDelayed(resizeRunnable, TIMEOUT)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    onDispose()
  }

  fun onDispose() {
    removeCallbacks(resizeRunnable)
    removeAllViews()
    viewSet = false
    oldSize = null
  }
}

interface LayoutListener {
  fun onLayoutSizeUpdate(size: Size)
}
