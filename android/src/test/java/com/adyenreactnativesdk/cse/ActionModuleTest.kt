/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.After
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ActionModuleTest {
  @After
  fun tearDown() {
    ActionModule.currentCallback = null
  }

  @Test
  fun `hide clears currentCallback`() {
    val activity = Robolectric.buildActivity(AppCompatActivity::class.java).create().get()
    val reactContext = mock<ReactApplicationContext>()
    whenever(reactContext.currentActivity).thenReturn(activity)
    val module = ActionModule(reactContext)
    ActionModule.currentCallback = module

    module.hide(true)

    assertNull(ActionModule.currentCallback)
  }
}
