/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import android.content.Intent
import android.net.Uri
import org.junit.After
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
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
    val returnIntent = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://action/payment?redirectResult=result"))

    ActionRedirectRouter.register(1, Uri.parse("myapp://action/payment")) { firstOperationCalls += 1 }
    assertTrue(ActionRedirectRouter.handleReturn(returnIntent))
    ActionRedirectRouter.unregister(1)
    ActionRedirectRouter.register(2, Uri.parse("myapp://action/payment")) { replacementOperationCalls += 1 }

    assertTrue(ActionRedirectRouter.handleReturn(returnIntent))

    assertTrue(firstOperationCalls == 1)
    assertTrue(replacementOperationCalls == 1)
  }

  @Test
  fun `unregistered Action route does not consume a return`() {
    assertFalse(ActionRedirectRouter.handleReturn(Intent("android.intent.action.VIEW")))
  }

  @Test
  fun `checkout-owned and unrelated returns are not consumed by Action`() {
    var actionCalls = 0
    ActionRedirectRouter.register(1, Uri.parse("myapp://action/payment")) { actionCalls += 1 }

    val checkoutReturn = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://checkout/payment?redirectResult=checkout"))
    val unrelatedReturn = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://other/payment?redirectResult=other"))

    assertFalse(ActionRedirectRouter.handleReturn(checkoutReturn))
    assertFalse(ActionRedirectRouter.handleReturn(unrelatedReturn))
    assertTrue(actionCalls == 0)
  }

  @Test
  fun `old Action route cannot consume a replacement return`() {
    var firstOperationCalls = 0
    var replacementOperationCalls = 0
    val oldReturn = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://action/one?redirectResult=old"))
    val replacementReturn = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://action/two?redirectResult=new"))

    ActionRedirectRouter.register(1, Uri.parse("myapp://action/one")) { firstOperationCalls += 1 }
    ActionRedirectRouter.unregister(1)
    ActionRedirectRouter.register(2, Uri.parse("myapp://action/two")) { replacementOperationCalls += 1 }

    assertFalse(ActionRedirectRouter.handleReturn(oldReturn))
    assertTrue(ActionRedirectRouter.handleReturn(replacementReturn))
    assertTrue(firstOperationCalls == 0)
    assertTrue(replacementOperationCalls == 1)
  }
}
