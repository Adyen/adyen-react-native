package com.adyenreactnativesdk.react.base

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Size
import android.view.View
import android.widget.FrameLayout

private const val TIMEOUT = 250L
private val mainHandler = Handler(Looper.getMainLooper())

open class DynamicComponentView(
  context: Context,
) : FrameLayout(context) {
  private val screenDensity = resources.displayMetrics.density
  private var oldSize: Size? = null

  var layoutListener: LayoutListener? = null
  var detachListener: (() -> Unit)? = null
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

  private var isDetachingFromWindow = false

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    isDetachingFromWindow = true
    try {
      onDispose()
      detachListener?.invoke()
    } finally {
      isDetachingFromWindow = false
    }
    // Children were already detached by the parent dispatch. Removing them while this view
    // still holds its attach info would detach a ComposeView twice and crash, so removal waits
    // until the detach has finished. A view re-attached meanwhile is rebound by Fabric instead.
    mainHandler.post {
      if (!isAttachedToWindow) onDispose()
    }
  }

  /** Explicit disposal from [AdyenComponentViewManager.onDropViewInstance]. */
  fun onDispose() {
    removeCallbacks(resizeRunnable)
    isViewSet = false
    oldSize = null
    if (!isDetachingFromWindow) removeAllViews()
  }
}

fun interface LayoutListener {
  fun onLayoutSizeUpdate(
    viewId: Int,
    size: Size,
  )
}
