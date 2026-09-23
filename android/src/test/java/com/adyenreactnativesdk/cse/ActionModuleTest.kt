/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ActionModuleTest {
  @Test
  fun `hide is idempotent when no standalone action is active`() {
    val context = mock<ReactApplicationContext>()
    val promise = mock<Promise>()
    doAnswer { invocation ->
      (invocation.arguments[0] as Runnable).run()
      null
    }.whenever(context).runOnUiQueueThread(any())
    val module = ActionModule(context)

    module.hide(promise)

    verify(promise).resolve(null)
  }
}
