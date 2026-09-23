/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import org.json.JSONObject

/** Validates the portable advanced submit protocol before the response settles the request. */
internal object AdvancedSubmitResponseValidator {
  fun isValid(payload: JSONObject): Boolean =
    when (payload.optString(TYPE)) {
      ACTION -> payload.optJSONObject(ACTION)?.let(::isValidAction) ?: false
      COMPLETED -> payload.hasString(RESULT_CODE)
      RETRY -> !payload.has(MESSAGE) || payload.isNull(MESSAGE) || payload.hasString(MESSAGE)
      FAILURE -> true
      else -> false
    }

  private fun isValidAction(action: JSONObject): Boolean = action.hasString(TYPE) && action.hasString(PAYMENT_METHOD_TYPE)

  private fun JSONObject.hasString(key: String): Boolean = has(key) && !isNull(key) && opt(key) is String

  private const val TYPE = "type"
  private const val ACTION = "action"
  private const val COMPLETED = "completed"
  private const val RETRY = "retry"
  private const val FAILURE = "failure"
  private const val RESULT_CODE = "resultCode"
  private const val MESSAGE = "message"
  private const val PAYMENT_METHOD_TYPE = "paymentMethodType"
}
