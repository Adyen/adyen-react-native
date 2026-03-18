package com.adyenreactnativesdk.react.base

import android.annotation.SuppressLint
import android.content.Context
import android.util.Size
import android.view.View
import android.view.ViewTreeObserver
import android.widget.FrameLayout

private const val TIMEOUT = 250L

class DynamicComponentView(
  context: Context,
) : FrameLayout(context) {
  private val screenDensity = resources.displayMetrics.density
  private var ignoreLayoutChanges = false
  private var interactionBlocked = false
  var layoutListener: LayoutListener? = null
  var viewSet = false
  private var globalListener: ViewTreeObserver.OnGlobalLayoutListener? = null
  private var oldSize: Size? = null
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
      measure(
        MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
        MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
      )
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
