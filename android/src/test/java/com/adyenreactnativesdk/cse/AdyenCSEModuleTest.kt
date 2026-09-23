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
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AdyenCSEModuleTest {
  @Test
  fun `validation commands settle independently without checkout ownership`() {
    val module = AdyenCSEModule(mock<ReactApplicationContext>())
    val numberPromise = mock<Promise>()
    val expiryPromise = mock<Promise>()
    val securityCodePromise = mock<Promise>()

    module.validateCardNumber("4111111111111111", true, numberPromise)
    module.validateCardExpiryDate("03", "2030", expiryPromise)
    module.validateCardSecurityCode("737", "visa", securityCodePromise)

    verify(numberPromise).resolve(eq(true))
    verify(expiryPromise).resolve(any<Boolean>())
    verify(securityCodePromise).resolve(eq(true))
  }

  @Test
  fun `encryption methods reject malformed inputs independently`() {
    val module = AdyenCSEModule(mock<ReactApplicationContext>())
    val cardPromise = mock<Promise>()
    val binPromise = mock<Promise>()

    module.encryptCard("not-json", "not-a-public-key", cardPromise)
    module.encryptBin("not-a-bin", "not-a-public-key", binPromise)

    verify(cardPromise).reject(eq("Encryption failed"), any<Throwable>())
    verify(binPromise).reject(eq("Encryption failed"), any<Throwable>())
  }
}
