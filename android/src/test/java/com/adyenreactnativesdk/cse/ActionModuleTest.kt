/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import androidx.appcompat.app.AppCompatActivity
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertNull
import org.junit.Ignore
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
@Ignore(
  "ActionModule's companion initializer reads ThreeDS2Service.INSTANCE.sdkVersion, which needs " +
    "native 3DS2 libraries that Robolectric cannot load, so <clinit> throws before any test body " +
    "runs. Re-enable by making threeDS2Version lazy, or move this to an instrumentation test.",
)
class ActionModuleTest {
  // TODO(v6): `currentController` is `private set`, so it cannot be seeded directly.
  //  Seeding it requires driving `handle()` with a real action and checkout configuration.
  //  Until then this only guards that `hide()` is safe with nothing pending and leaves
  //  no controller registered.
  @Test
  fun `hide leaves no pending controller`() {
    val activity = Robolectric.buildActivity(AppCompatActivity::class.java).create().get()
    val reactContext = mock<ReactApplicationContext>()
    whenever(reactContext.currentActivity).thenReturn(activity)
    val module = ActionModule(reactContext)

    module.hide(true)

    assertNull(ActionModule.currentController)
  }
}
