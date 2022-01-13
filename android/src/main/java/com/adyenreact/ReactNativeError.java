package com.adyenreact;

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
        map.putString(REASON_KEY, error.getCause().getLocalizedMessage());
        map.putString(DISCRIPTION_KEY, error.getStackTrace().toString());
        return map;
    }

}
