/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react.base

import android.view.View
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.adyenreactnativesdk.react.FabricRegistrationCreation
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.yield
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

  @Test
  fun lateOldFactoryCompletionAfterReplacementCannotAttachOldUi() {
    val trace = mutableListOf<String>()
    val oldCreation = FabricRegistrationCreation<String>()
    val newCreation = FabricRegistrationCreation<String>()
    val oldFactoryResult = CompletableDeferred<String?>()
    var oldCurrent = true
    var oldDisposed = false
    var attached: String? = null

    runBlocking {
      val old =
        launch {
          oldCreation.createAndAttach(
            create = {
              trace += "old-create"
              oldFactoryResult.await()
            },
            isCurrent = { oldCurrent },
            attach = { attached = it },
            dispose = {
              if (!oldDisposed) {
                oldDisposed = true
                trace += "old-dispose"
              }
            },
            onFailure = { throw AssertionError("old factory must not fail", it) },
          )
        }
      while (trace.isEmpty()) yield()
      trace += "old-terminal"
      oldCurrent = false
      // Prop replacement disposes the old registration before the new factory begins.
      if (!oldDisposed) {
        oldDisposed = true
        trace += "old-dispose"
      }
      newCreation.createAndAttach(
        create = {
          trace += "new-create"
          "new-controller"
        },
        isCurrent = { true },
        attach = {
          attached = it
          trace += "new-publish"
        },
        dispose = { trace += "new-dispose" },
        onFailure = { throw AssertionError("new factory must not fail", it) },
      )
      oldFactoryResult.complete("old-controller")
      old.join()
    }

    assertEquals(listOf("old-create", "old-terminal", "old-dispose", "new-create", "new-publish"), trace)
    assertEquals("new-controller", attached)
  }

  @Test
  fun replacementFactoryFailureDisposesRegistrationAndLeavesViewInactive() {
    val trace = mutableListOf<String>()
    val creation = FabricRegistrationCreation<String>()
    var attached: String? = null

    runBlocking {
      trace += "old-terminal"
      trace += "old-dispose"
      creation.createAndAttach(
        create = {
          trace += "new-create"
          throw IllegalStateException("factory failure")
        },
        isCurrent = { true },
        attach = { attached = it },
        dispose = { trace += "new-dispose" },
        onFailure = { trace += "new-inactive" },
      )
    }

    assertEquals(listOf("old-terminal", "old-dispose", "new-create", "new-inactive", "new-dispose"), trace)
    assertEquals(null, attached)
  }

  private class TestDynamicComponentView(
    context: android.content.Context,
  ) : DynamicComponentView(context) {
    fun detachForTest() {
      onDetachedFromWindow()
    }
  }
}
