/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react.base

import android.app.Activity
import android.os.Looper
import android.view.View
import android.widget.FrameLayout
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class DynamicComponentViewTest {
  @Test
  fun detachDisposesOwnedChildBeforeTheStateCanClearItsViewFlag() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    lateinit var view: TestDynamicComponentView

    instrumentation.runOnMainSync {
      view = TestDynamicComponentView(instrumentation.targetContext)
      view.setView(View(instrumentation.targetContext))

      view.detachForTest()

      assertFalse(view.isViewSet)
    }
    shadowOf(Looper.getMainLooper()).idle()

    assertEquals(0, view.childCount)
  }

  @Test
  fun windowDetachNeverDetachesTheOwnedChildTwice() {
    val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
    val container = FrameLayout(activity)
    activity.setContentView(container)
    val view = DynamicComponentView(activity)
    val child = DetachCountingView(activity)
    var listenerCalls = 0
    view.detachListener = { listenerCalls += 1 }
    container.addView(view)
    view.setView(child)

    container.removeView(view)

    assertEquals(1, child.detachCount)
    assertEquals(1, listenerCalls)
    assertFalse(view.isViewSet)
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals(0, view.childCount)
    assertEquals(1, child.detachCount)
  }

  @Test
  fun reattachedViewKeepsTheChildBoundAfterItsDetach() {
    val activity = Robolectric.buildActivity(Activity::class.java).setup().get()
    val container = FrameLayout(activity)
    activity.setContentView(container)
    val view = DynamicComponentView(activity)
    container.addView(view)
    container.removeView(view)
    container.addView(view)
    view.setView(View(activity))

    shadowOf(Looper.getMainLooper()).idle()

    assertTrue(view.isViewSet)
    assertEquals(1, view.childCount)
  }

  @Test
  fun recycleDisposesOwnedChildViewExactlyOnce() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()

    instrumentation.runOnMainSync {
      val context = instrumentation.targetContext
      val view = DynamicComponentView(context)
      view.setView(View(context))

      assertTrue(view.isViewSet)
      assertEquals(1, view.childCount)

      view.onDispose()
      view.onDispose()

      assertFalse(view.isViewSet)
      assertEquals(0, view.childCount)
    }
  }

  private class DetachCountingView(
    context: android.content.Context,
  ) : View(context) {
    var detachCount = 0

    override fun onDetachedFromWindow() {
      super.onDetachedFromWindow()
      detachCount += 1
    }
  }

  private class TestDynamicComponentView(
    context: android.content.Context,
  ) : DynamicComponentView(context) {
    fun detachForTest() {
      onDetachedFromWindow()
    }
  }
}
