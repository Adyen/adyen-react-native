/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adyen.checkout.components.model.PaymentMethodsApiResponse;
import com.adyen.checkout.components.model.paymentmethods.PaymentMethod;
import com.adyenreactnativesdk.ReactNativeError;
import com.adyenreactnativesdk.ReactNativeJson;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONException;
import org.json.JSONObject;

public abstract class BaseModule extends ReactContextBaseJavaModule {

    final String DID_SUBMIT = "didSubmitCallback";
    final String DID_FAILED = "didFailCallback";
    final String DID_PROVIDE = "didProvideCallback";
    final String DID_COMPLEATE = "didCompleteCallback";

    public BaseModule(ReactApplicationContext context) {
        super(context);
    }

    protected void sendEvent(@NonNull String eventName, @Nullable ReadableMap map) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, map);
    }

    @Nullable
    protected PaymentMethodsApiResponse getPaymentMethodsApiResponse(ReadableMap paymentMethods) {
        PaymentMethodsApiResponse paymentMethodsResponse;
        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(paymentMethods);
            paymentMethodsResponse = PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return null;
        }
        return paymentMethodsResponse;
    }

    @Nullable
    protected PaymentMethod getPaymentMethod(PaymentMethodsApiResponse paymentMethodsResponse, String paymentMethodName) {
        PaymentMethod paymentMethod = null;
        for (PaymentMethod currentPaymentMethod : paymentMethodsResponse.getPaymentMethods()) {
            if (currentPaymentMethod.getType().equals(paymentMethodName)) {
                paymentMethod = currentPaymentMethod;
                break;
            }
        }

        if (paymentMethod == null) {
            sendEvent(DID_FAILED, ReactNativeError.mapError("Payment methods does not contain " + paymentMethodName));
            return null;
        }
        return paymentMethod;
    }
}
