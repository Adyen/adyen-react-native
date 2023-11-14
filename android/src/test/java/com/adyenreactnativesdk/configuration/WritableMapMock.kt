package com.adyenreactnativesdk.configuration

import com.facebook.react.bridge.Dynamic
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableMapKeySetIterator
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import java.util.HashMap

class WritableMapMock: WritableMap {

    private val map: MutableMap<String, Any?> = mutableMapOf()

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
        return map.getValue(p0) as Double
    }

    override fun getInt(p0: String): Int {
        return map.getValue(p0) as Int
    }

    override fun getString(p0: String): String? {
        return map.getValue(p0) as String
    }

    override fun getArray(p0: String): ReadableArray? {
        return map.getValue(p0) as ReadableArray
    }

    override fun getMap(p0: String): ReadableMap? {
        return map.getValue(p0) as ReadableMap
    }

    override fun getDynamic(p0: String): Dynamic {
        TODO("Not yet implemented")
    }

    override fun getType(p0: String): ReadableType {
        TODO("Not yet implemented")
    }

    override fun getEntryIterator(): MutableIterator<MutableMap.MutableEntry<String, Any>> {
        TODO("Not yet implemented")
    }

    override fun keySetIterator(): ReadableMapKeySetIterator {
        TODO("Not yet implemented")
    }

    override fun toHashMap(): HashMap<String, Any> {
        TODO("Not yet implemented")
    }

    override fun putNull(p0: String) {
        map.put(p0, null)
    }

    override fun putBoolean(p0: String, p1: Boolean) {
        map.put(p0, p1)
    }

    override fun putDouble(p0: String, p1: Double) {
        map.put(p0, p1)
    }

    override fun putInt(p0: String, p1: Int) {
        map.put(p0, p1)
    }

    override fun putString(p0: String, p1: String?) {
        map.put(p0, p1)
    }

    override fun putArray(p0: String, p1: ReadableArray?) {
        map.put(p0, p1)
    }

    override fun putMap(p0: String, p1: ReadableMap?) {
        map.put(p0, p1)
    }

    override fun merge(p0: ReadableMap) {
        TODO("Not yet implemented")
    }

    override fun copy(): WritableMap {
        TODO("Not yet implemented")
    }

}