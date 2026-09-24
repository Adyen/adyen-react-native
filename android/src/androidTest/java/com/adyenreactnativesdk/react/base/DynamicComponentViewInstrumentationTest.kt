/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react.base

import android.view.View
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class DynamicComponentViewInstrumentationTest {
  @Test
  fun detachDisposesOwnedChildBeforeTheStateCanClearItsViewFlag() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()

    instrumentation.runOnMainSync {
      val view = TestDynamicComponentView(instrumentation.targetContext)
      view.setView(View(instrumentation.targetContext))

      view.detachForTest()

      assertFalse(view.isViewSet)
      assertEquals(0, view.childCount)
    }
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

  private class TestDynamicComponentView(
    context: android.content.Context,
  ) : DynamicComponentView(context) {
    fun detachForTest() {
      onDetachedFromWindow()
    }
  }
}
