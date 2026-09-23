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
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ActionModuleTest {
  @Test
  fun `token-free RedirectAction rejects before configuration or presentation setup`() {
    val context = mainThreadContext()
    val promise = mock<Promise>()
    val module = ActionModule(context)

    module.handle(
      """
      {
        "type": "redirect",
        "paymentData": "payment-data",
        "paymentMethodType": "ideal",
        "method": "GET",
        "url": "https://issuer.example/redirect?opaque=provider-value"
      }
      """.trimIndent(),
      "not-valid-configuration-json",
      promise,
    )

    verify(promise).reject(eq("unsupportedCapability"), any<String>())
  }

  @Test
  fun `a supported action can start after a rejected RedirectAction`() {
    val context = mainThreadContext()
    val redirectPromise = mock<Promise>()
    val supportedPromise = mock<Promise>()
    val module = ActionModule(context)

    module.handle("""{"type":"redirect"}""", "not-valid-configuration-json", redirectPromise)
    module.handle("""{"type":"await"}""", "not-valid-configuration-json", supportedPromise)

    verify(redirectPromise).reject(eq("unsupportedCapability"), any<String>())
    verify(supportedPromise).reject(eq("parsingError"), any<String>(), any<Exception>())
  }

  @Test
  fun `hide is idempotent when no standalone action is active`() {
    val context = mainThreadContext()
    val promise = mock<Promise>()
    val module = ActionModule(context)

    module.hide(promise)

    verify(promise).resolve(null)
  }

  @Test
  fun `operation cleanup tokens remain process unique`() {
    assert(ActionOperationToken.create() != ActionOperationToken.create())
  }

  private fun mainThreadContext(): ReactApplicationContext {
    val context = mock<ReactApplicationContext>()
    doAnswer { invocation ->
      (invocation.arguments[0] as Runnable).run()
      null
    }.whenever(context).runOnUiQueueThread(any())
    return context
  }
}
