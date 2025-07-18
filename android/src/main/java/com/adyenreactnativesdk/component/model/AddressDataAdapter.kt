package com.adyenreactnativesdk.component.model

import com.adyen.checkout.components.core.AddressData
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import java.lang.reflect.Type

class AddressDataAdapter : JsonDeserializer<AddressData> {
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): AddressData {
        val jsonObject = json?.asJsonObject ?: JsonObject()

        return AddressData(
            postalCode = jsonObject.getAsJsonPrimitive("postalCode")?.asString ?: "",
            street = jsonObject.getAsJsonPrimitive("street")?.asString ?: "",
            stateOrProvince = jsonObject.getAsJsonPrimitive("stateOrProvince")?.asString ?: "",
            houseNumberOrName = jsonObject.getAsJsonPrimitive("houseNumberOrName")?.asString ?: "",
            apartmentSuite = jsonObject.getAsJsonPrimitive("apartmentSuite")?.asString,
            city = jsonObject.getAsJsonPrimitive("city")?.asString ?: "",
            country = jsonObject.getAsJsonPrimitive("country")?.asString ?: ""
        )
    }
}