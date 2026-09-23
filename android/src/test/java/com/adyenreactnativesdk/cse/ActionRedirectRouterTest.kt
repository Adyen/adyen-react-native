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
    ActionRedirectRouter.unregister("action-a")
    ActionRedirectRouter.unregister("action-b")
  }

  @Test
  fun `redirect reaches only the operation that owns the Action route`() {
    var firstOperationCalls = 0
    val returnIntent =
      Intent(
        Intent.ACTION_VIEW,
        Uri.parse("myapp://action/payment?${ActionRedirectRouter.OPERATION_PARAMETER}=action-a&redirectResult=result"),
      )

    assertTrue(ActionRedirectRouter.register("action-a", Uri.parse("myapp://action/payment")) { firstOperationCalls += 1 })
    assertTrue(ActionRedirectRouter.handleReturn(returnIntent))
    assertTrue(firstOperationCalls == 1)
    assertFalse(ActionRedirectRouter.handleReturn(returnIntent))
  }

  @Test
  fun `unregistered Action route does not consume a return`() {
    assertFalse(ActionRedirectRouter.handleReturn(Intent("android.intent.action.VIEW")))
  }

  @Test
  fun `checkout-owned and unrelated returns are not consumed by Action`() {
    var actionCalls = 0
    assertTrue(ActionRedirectRouter.register("action-a", Uri.parse("myapp://action/payment")) { actionCalls += 1 })

    val checkoutReturn = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://checkout/payment?redirectResult=checkout"))
    val unrelatedReturn = Intent(Intent.ACTION_VIEW, Uri.parse("myapp://other/payment?redirectResult=other"))

    assertFalse(ActionRedirectRouter.handleReturn(checkoutReturn))
    assertFalse(ActionRedirectRouter.handleReturn(unrelatedReturn))
    assertTrue(actionCalls == 0)
  }

  @Test
  fun `foreign owner cannot replace an active route until exact owner unregisters`() {
    var firstOperationCalls = 0
    var replacementOperationCalls = 0

    assertTrue(ActionRedirectRouter.register("action-a", Uri.parse("myapp://action/payment")) { firstOperationCalls += 1 })
    assertFalse(ActionRedirectRouter.register("action-b", Uri.parse("myapp://action/payment")) { replacementOperationCalls += 1 })
    ActionRedirectRouter.unregister("action-b")
    assertFalse(ActionRedirectRouter.register("action-b", Uri.parse("myapp://action/payment")) { replacementOperationCalls += 1 })

    ActionRedirectRouter.unregister("action-a")
    assertTrue(ActionRedirectRouter.register("action-b", Uri.parse("myapp://action/payment")) { replacementOperationCalls += 1 })
    ActionRedirectRouter.unregister("action-a")

    assertTrue(
      ActionRedirectRouter.handleReturn(
        Intent(
          Intent.ACTION_VIEW,
          Uri.parse("myapp://action/payment?${ActionRedirectRouter.OPERATION_PARAMETER}=action-b&redirectResult=result"),
        ),
      ),
    )
    assertTrue(firstOperationCalls == 0)
    assertTrue(replacementOperationCalls == 1)
  }

  @Test
  fun `stale same-base return remains unconsumed after replacement starts`() {
    var replacementOperationCalls = 0
    val staleReturn =
      Intent(
        Intent.ACTION_VIEW,
        Uri.parse("myapp://action/payment?${ActionRedirectRouter.OPERATION_PARAMETER}=action-a&redirectResult=stale"),
      )
    val replacementReturn =
      Intent(
        Intent.ACTION_VIEW,
        Uri.parse(
          "myapp://action/payment?${ActionRedirectRouter.OPERATION_PARAMETER}=action-b&redirectResult=dynamic-result",
        ),
      )

    assertTrue(ActionRedirectRouter.register("action-a", Uri.parse("myapp://action/payment")) {})
    ActionRedirectRouter.unregister("action-a")
    assertTrue(ActionRedirectRouter.register("action-b", Uri.parse("myapp://action/payment")) { replacementOperationCalls += 1 })

    assertFalse(ActionRedirectRouter.handleReturn(staleReturn))
    assertTrue(ActionRedirectRouter.handleReturn(replacementReturn))
    assertFalse(ActionRedirectRouter.handleReturn(replacementReturn))
    assertTrue(replacementOperationCalls == 1)
  }

  @Test
  fun `native operation tokens are process-unique`() {
    assertTrue(ActionOperationToken.create() != ActionOperationToken.create())
  }
}
