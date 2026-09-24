/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AndroidCheckoutModuleTest {
  @Test
  fun `session and advanced lookup reject before creating requests callbacks or UI`() {
    val context = mock<ReactApplicationContext>()
    val messageBus = mock<MessageBus>()
    val sessionPromise = PromiseRecorder()
    val advancedPromise = PromiseRecorder()
    val module = AndroidCheckoutModule(context, messageBus) { JavaOnlyMap() }
    val configuration = """{"clientKey":"test_client_key","card":{"addressVisibility":"lookup"}}"""

    module.setupSession("""{"id":"session-id","sessionData":"session-data"}""", configuration, sessionPromise)
    module.setupAdvanced("""{"paymentMethods":[]}""", configuration, advancedPromise)

    assertUnsupportedAddressLookup(sessionPromise)
    assertUnsupportedAddressLookup(advancedPromise)
    verify(context, never()).runOnUiQueueThread(any())
    verifyNoInteractions(messageBus)
    assertNull(CheckoutCoordinator.shared.activeCheckoutId())
    assertNull(CheckoutCoordinator.shared.activeRequest())
  }

  private fun assertUnsupportedAddressLookup(promise: PromiseRecorder) {
    assertEquals("unsupportedCapability", promise.code)
    assertEquals("Address lookup is unsupported by the pinned Android SDK", promise.message)
    assertEquals("addressLookup", promise.metadata?.getString("capability"))
    assertEquals("setup", promise.metadata?.getString("phase"))
  }

  private class PromiseRecorder : Promise {
    var code: String? = null
    var message: String? = null
    var metadata: WritableMap? = null

    override fun resolve(value: Any?) = Unit

    override fun reject(
      code: String?,
      message: String?,
    ) = Unit

    override fun reject(
      code: String?,
      throwable: Throwable?,
    ) = Unit

    override fun reject(
      code: String?,
      message: String?,
      throwable: Throwable?,
    ) = Unit

    override fun reject(throwable: Throwable) = Unit

    override fun reject(
      throwable: Throwable,
      userInfo: WritableMap,
    ) = Unit

    override fun reject(
      code: String?,
      userInfo: WritableMap,
    ) = Unit

    override fun reject(
      code: String?,
      throwable: Throwable?,
      userInfo: WritableMap,
    ) = Unit

    override fun reject(
      code: String?,
      message: String?,
      userInfo: WritableMap,
    ) {
      this.code = code
      this.message = message
      metadata = userInfo
    }

    override fun reject(
      code: String?,
      message: String?,
      throwable: Throwable?,
      userInfo: WritableMap?,
    ) = Unit

    @Deprecated("Required to implement Promise")
    override fun reject(message: String) = Unit
  }
}
