package com.adyenreactnativesdk.component.model

import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.AddressData
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.OrderResponse
import com.adyen.checkout.sessions.core.SessionPaymentResult
import org.json.JSONArray
import org.json.JSONObject
import kotlin.reflect.KClass

fun SessionPaymentResult.toJSONObject(): JSONObject =
  JSONObject().apply {
    put("resultCode", resultCode)
    put("order", order?.let { OrderResponse.Companion.SERIALIZER.serialize(it) })
    put("sessionResult", sessionResult)
    put("sessionData", sessionData)
    put("sessionId", sessionId)
  }

fun Order.toJSONObject(shouldUpdatePaymentMethods: Boolean): JSONObject =
  JSONObject().apply {
    put("order", Order.SERIALIZER.serialize(this@toJSONObject))
    put("shouldUpdatePaymentMethods", shouldUpdatePaymentMethods)
  }

fun List<BinLookupData>.toJSONObject(): JSONArray {
  val jsonList = this.map { JSONObject().apply { put("brand", it.brand) } }
  return JSONArray().apply {
    jsonList.forEach { put(it) }
  }
}

fun LookupAddress.toJSONObject(): JSONObject =
  JSONObject().apply {
    put("id", id)
    put("address", address.toJSONObject())
  }

fun KClass<LookupAddress>.fromJsonObject(json: JSONObject): LookupAddress =
  LookupAddress(
    id = json.getString("id"),
    address = AddressData::class.fromJsonObject(json.getJSONObject("address")),
  )

fun AddressData.toJSONObject(): JSONObject =
  JSONObject().apply {
    putOpt("city", city)
    putOpt("country", country)
    putOpt("houseNumberOrName", houseNumberOrName)
    putOpt("apartmentSuite", apartmentSuite)
    putOpt("postalCode", postalCode)
    putOpt("stateOrProvince", stateOrProvince)
    putOpt("street", street)
  }

fun KClass<AddressData>.fromJsonObject(json: JSONObject): AddressData =
  AddressData(
    postalCode = json.getString("postalCode"),
    street = json.getString("street"),
    city = json.getString("city"),
    country = json.getString("country"),
    houseNumberOrName = json.getString("houseNumberOrName"),
    apartmentSuite = json.getOptString("apartmentSuite"),
    stateOrProvince = json.getString("stateOrProvince"),
  )

fun JSONObject.getOptString(key: String): String? = if (has(key) && !isNull(key)) getString(key) else null
