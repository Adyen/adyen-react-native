package com.adyenreactnativesdk.util

object AdyenConstants {
  const val PARAMETER_MESSAGE = "message"
  const val PARAMETER_RETURN_URL = "returnUrl"
}

enum class ResultCodes(
  val value: String,
) {
  PRESENT_TO_SHOPPER("PresentToShopper"),
}
