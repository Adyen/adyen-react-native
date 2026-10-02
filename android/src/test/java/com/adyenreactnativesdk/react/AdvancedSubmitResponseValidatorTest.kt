/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import org.json.JSONObject
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AdvancedSubmitResponseValidatorTest {
  @Test
  fun `accepts complete portable submit variants`() {
    assertTrue(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject(
          """
          {
            "type": "action",
            "action": { "type": "threeDS2", "paymentMethodType": "scheme" }
          }
          """.trimIndent(),
        ),
      ),
    )
    assertTrue(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject("""{"type":"completed","resultCode":"Authorised"}"""),
      ),
    )
    assertTrue(AdvancedSubmitResponseValidator.isValid(JSONObject("""{"type":"retry"}""")))
    assertTrue(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject("""{"type":"retry","message":"Try again"}"""),
      ),
    )
  }

  @Test
  fun `rejects malformed action before it reaches action extraction`() {
    assertFalse(AdvancedSubmitResponseValidator.isValid(JSONObject("""{"type":"action"}""")))
    assertFalse(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject("""{"type":"action","action":{"type":"threeDS2"}}"""),
      ),
    )
    assertFalse(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject("""{"type":"action","action":{"paymentMethodType":"scheme"}}"""),
      ),
    )
  }

  @Test
  fun `rejects malformed completed and retry variants`() {
    assertFalse(AdvancedSubmitResponseValidator.isValid(JSONObject("""{"type":"completed"}""")))
    assertFalse(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject("""{"type":"completed","resultCode":1}"""),
      ),
    )
    assertFalse(
      AdvancedSubmitResponseValidator.isValid(
        JSONObject("""{"type":"retry","message":1}"""),
      ),
    )
  }
}
