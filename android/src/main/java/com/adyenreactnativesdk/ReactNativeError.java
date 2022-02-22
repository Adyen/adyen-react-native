/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk;

import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;

public class ReactNativeError {

    final static String MESSAGE_KEY = "message";
    final static String REASON_KEY = "reason";
    final static String DISCRIPTION_KEY = "discription";
    final static String RECOVERY_KEY = "recovery";


    public static ReadableMap mapError(String message) {
        WritableMap map = new WritableNativeMap();
        map.putString(MESSAGE_KEY, message);
        return map;
    }

    public static ReadableMap mapError(Exception error) {
        WritableMap map = new WritableNativeMap();
        map.putString(MESSAGE_KEY, error.getLocalizedMessage());

        Throwable cause = error.getCause();
        if (cause != null) {
            map.putString(REASON_KEY, cause.getLocalizedMessage());
        }

        StackTraceElement[] stackTrace = error.getStackTrace();
        if (stackTrace != null && stackTrace.length > 0) {
            map.putString(DISCRIPTION_KEY, stackTrace.toString());
        }
        return map;
    }

}
