/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.util

import android.util.Log
import com.adyenreactnativesdk.component.BaseModuleException
import com.adyenreactnativesdk.component.KnownException
import com.adyenreactnativesdk.component.dropin.DropInException
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap
import java.lang.Exception

object ReactNativeError {

    private const val MESSAGE_KEY = "message"
    private const val REASON_KEY = "reason"
    private const val DISCRIPTION_KEY = "discription"
    private const val RECOVERY_KEY = "recovery"
    private const val ERROR_CODE = "errorCode"

    fun mapError(message: String?): ReadableMap {
        return WritableNativeMap().apply {
            putString(MESSAGE_KEY, message)
        }
    }

    fun mapError(error: Exception): ReadableMap {
        return WritableNativeMap().apply {
            putString(MESSAGE_KEY, error.localizedMessage)
            error.cause?.let {
                putString(REASON_KEY, it.localizedMessage)
            }

            val stackTrace = error.stackTrace
            if (stackTrace.isNotEmpty()) {
                putString(DISCRIPTION_KEY, stackTrace.toString())
            }

            (error as? KnownException)?.let {
                putString(ERROR_CODE, it.code)
            }
        }
    }

}