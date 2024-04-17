/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.util

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

// Kudos to @viperwarp
// https://gist.github.com/viperwarp/2beb6bbefcc268dee7ad#file-reactnativejson-java
object ReactNativeJson {
    @Throws(JSONException::class)
    fun convertJsonToMap(jsonObject: JSONObject): WritableMap {
        val map: WritableMap = WritableNativeMap()
        val iterator = jsonObject.keys()
        while (iterator.hasNext()) {
            val key = iterator.next()
            val value = jsonObject[key]
            when {
                value is JSONObject -> map.putMap(key, convertJsonToMap(value))
                value is JSONArray -> map.putArray(key, convertJsonToArray(value))
                value is Boolean -> map.putBoolean(key, value)
                value is Long && value <= Int.MAX_VALUE -> map.putInt(key, value.toInt())
                value is Int -> map.putInt(key, value)
                value is Double -> map.putDouble(key, value)
                value is String -> map.putString(key, value)
                else -> map.putString(key, value.toString())
            }
        }
        return map
    }

    @Throws(JSONException::class)
    fun convertJsonToArray(jsonArray: JSONArray): WritableArray {
        val array: WritableArray = WritableNativeArray()
        for (i in 0 until jsonArray.length()) {
            val value = jsonArray[i]
            when {
                value is JSONObject -> array.pushMap(convertJsonToMap(value))
                value is JSONArray -> array.pushArray(convertJsonToArray(value))
                value is Boolean -> array.pushBoolean(value)
                value is Long && value <= Int.MAX_VALUE -> array.pushInt(value.toInt())
                value is Int -> array.pushInt(value)
                value is Double -> array.pushDouble(value)
                value is String -> array.pushString(value)
                else -> array.pushString(value.toString())
            }
        }
        return array
    }

    @Throws(JSONException::class)
    fun convertMapToJson(readableMap: ReadableMap?): JSONObject {
        val obj = JSONObject()
        val iterator = readableMap!!.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                ReadableType.Null -> obj.put(key, JSONObject.NULL)
                ReadableType.Boolean -> obj.put(key, readableMap.getBoolean(key))
                ReadableType.Number -> obj.put(key, readableMap.getDouble(key))
                ReadableType.String -> obj.put(key, readableMap.getString(key))
                ReadableType.Map -> obj.put(key, convertMapToJson(readableMap.getMap(key)))
                ReadableType.Array -> obj.put(
                    key, convertArrayToJson(
                        readableMap.getArray(key)
                    )
                )
            }
        }
        return obj
    }

    @Throws(JSONException::class)
    fun convertArrayToJson(readableArray: ReadableArray?): JSONArray {
        val array = JSONArray()
        for (i in 0 until readableArray!!.size()) {
            when (readableArray.getType(i)) {
                ReadableType.Null -> {}
                ReadableType.Boolean -> array.put(readableArray.getBoolean(i))
                ReadableType.Number -> array.put(readableArray.getDouble(i))
                ReadableType.String -> array.put(readableArray.getString(i))
                ReadableType.Map -> array.put(convertMapToJson(readableArray.getMap(i)))
                ReadableType.Array -> array.put(convertArrayToJson(readableArray.getArray(i)))
            }
        }
        return array
    }
}
