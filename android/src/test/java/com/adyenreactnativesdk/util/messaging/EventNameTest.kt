/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.util.messaging

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EventNameTest {
  @Test
  fun `mainEvents returns correct event values`() {
    // WHEN
    val mainEvents = EventName.mainEvents()

    // THEN
    assertEquals(4, mainEvents.size)
    assertTrue(mainEvents.contains(EventName.SUBMIT.value))
    assertTrue(mainEvents.contains(EventName.ERROR.value))
    assertTrue(mainEvents.contains(EventName.COMPLETE_VOUCHER.value))
    assertTrue(mainEvents.contains(EventName.ADDITIONAL_DETAILS.value))
  }

  @Test
  fun `sessionEvents returns correct event values`() {
    // WHEN
    val sessionEvents = EventName.sessionEvents()

    // THEN
    assertEquals(2, sessionEvents.size)
    assertTrue(sessionEvents.contains(EventName.SESSION_ERROR.value))
    assertTrue(sessionEvents.contains(EventName.COMPLETE_SESSION.value))
  }

  @Test
  fun `EventName values match expected callback names`() {
    assertEquals("didSubmitCallback", EventName.SUBMIT.value)
    assertEquals("didFailCallback", EventName.ERROR.value)
    assertEquals("didCompleteCallback", EventName.COMPLETE_VOUCHER.value)
    assertEquals("didSessionCompleteCallback", EventName.COMPLETE_SESSION.value)
    assertEquals("didProvideCallback", EventName.ADDITIONAL_DETAILS.value)
    assertEquals("didSessionErrorCallback", EventName.SESSION_ERROR.value)
    assertEquals("didUpdateAddressCallback", EventName.UPDATE_ADDRESS.value)
    assertEquals("didConfirmAddressCallback", EventName.CONFIRM_ADDRESS.value)
    assertEquals("didDisableStoredPaymentMethodCallback", EventName.DISABLE_STORED_PAYMENT_METHOD.value)
    assertEquals("didCheckBalanceCallback", EventName.CHECK_BALANCE.value)
    assertEquals("didRequestOrderCallback", EventName.REQUEST_ORDER.value)
    assertEquals("didCancelOrderCallback", EventName.CANCEL_ORDER.value)
    assertEquals("didBinLookupCallback", EventName.BIN_LOOKUP.value)
    assertEquals("didChangeBinValueCallback", EventName.CHANGE_BIN_VALUE.value)
  }
}
