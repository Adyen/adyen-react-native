/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import android.content.Intent
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ActionRedirectRouterTest {
  @After
  fun tearDown() {
    ActionRedirectRouter.unregister(1)
    ActionRedirectRouter.unregister(2)
  }

  @Test
  fun `redirect reaches only the operation that owns the Action route`() {
    var firstOperationCalls = 0
    var replacementOperationCalls = 0
    val returnIntent = Intent("android.intent.action.VIEW")

    ActionRedirectRouter.register(1) { firstOperationCalls += 1 }
    assertTrue(ActionRedirectRouter.handleReturn(returnIntent))
    ActionRedirectRouter.unregister(1)
    ActionRedirectRouter.register(2) { replacementOperationCalls += 1 }

    assertTrue(ActionRedirectRouter.handleReturn(returnIntent))

    assertTrue(firstOperationCalls == 1)
    assertTrue(replacementOperationCalls == 1)
  }

  @Test
  fun `unregistered Action route does not consume a return`() {
    assertFalse(ActionRedirectRouter.handleReturn(Intent("android.intent.action.VIEW")))
  }
}
