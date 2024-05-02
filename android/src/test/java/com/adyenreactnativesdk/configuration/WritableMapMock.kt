/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap

class WritableMapMock: WritableMap, ReadableMapKeySetIterator {

    private val map: MutableMap<String, Any?> = mutableMapOf()
    private lateinit var iterator: MutableIterator<MutableMap.MutableEntry<String, Any>>

    override fun hasKey(p0: String): Boolean {
        return map.containsKey(p0)
    }

    override fun isNull(p0: String): Boolean {
        return map.getValue(p0) == null
    }

    override fun getBoolean(p0: String): Boolean {
        return map.getValue(p0) as Boolean
    }

    override fun getDouble(p0: String): Double {
        return when (val value = map[p0]) {
            is Double -> value
            is Int -> value.toDouble()
            else -> Double.NaN
        }
    }

    override fun getInt(p0: String): Int {
        return map.getValue(p0) as Int
    }

    override fun getString(p0: String): String {
        return map.getValue(p0) as String
    }

    override fun getArray(p0: String): ReadableArray {
        return map.getValue(p0) as ReadableArray
    }

    override fun getMap(p0: String): ReadableMap {
        return map.getValue(p0) as ReadableMap
    }

    override fun getDynamic(p0: String): Dynamic {
        TODO("Not yet implemented")
    }

    override fun getType(p0: String): ReadableType {
        return when (map[p0]) {
            is String -> ReadableType.String
            is Double -> ReadableType.Number
            is Float -> ReadableType.Number
            is Int -> ReadableType.Number
            is Long -> ReadableType.Number
            is Map<*,*> -> ReadableType.Map
            is Boolean -> ReadableType.Boolean
            is Array<*> -> ReadableType.Array
            else -> ReadableType.Null
        }
    }

    override fun getEntryIterator(): MutableIterator<MutableMap.MutableEntry<String, Any>> {
        val noNullMap: MutableMap<String, Any> = mutableMapOf()
        map.forEach { (key, value) -> value?.let { noNullMap[key] = it } }
        return noNullMap.iterator()
    }

    override fun keySetIterator(): ReadableMapKeySetIterator {
        iterator = entryIterator
        return this
    }

    override fun toHashMap(): HashMap<String, Any> {
        TODO("Not yet implemented")
    }

    override fun putNull(p0: String) {
        map[p0] = null
    }

    override fun putBoolean(p0: String, p1: Boolean) {
        map[p0] = p1
    }

    override fun putDouble(p0: String, p1: Double) {
        map[p0] = p1
    }

    override fun putInt(p0: String, p1: Int) {
        map[p0] = p1
    }

    override fun putString(p0: String, p1: String?) {
        map[p0] = p1
    }

    override fun putArray(p0: String, p1: ReadableArray?) {
        map[p0] = p1
    }

    override fun putMap(p0: String, p1: ReadableMap?) {
        map[p0] = p1
    }

    override fun merge(p0: ReadableMap) {
        TODO("Not yet implemented")
    }

    override fun copy(): WritableMap {
        TODO("Not yet implemented")
    }

    override fun hasNextKey(): Boolean {
        return iterator.hasNext()
    }

    override fun nextKey(): String {
        return iterator.next().key
    }

}