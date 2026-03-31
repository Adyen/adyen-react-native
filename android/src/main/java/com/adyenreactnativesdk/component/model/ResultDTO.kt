package com.adyenreactnativesdk.component.model

import kotlinx.parcelize.Parcelize
import org.json.JSONObject

@Parcelize
data class ResultDTO(
  val resultCode: String?,
) {
  fun toJSONObject(): JSONObject =
    JSONObject().apply {
      put("resultCode", resultCode)
    }
}
