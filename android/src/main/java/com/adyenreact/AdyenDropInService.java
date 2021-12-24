/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreact;

import android.util.Log;

import androidx.annotation.NonNull;

import com.adyen.checkout.components.ActionComponentData;
import com.adyen.checkout.components.PaymentComponentState;
import com.adyen.checkout.dropin.service.DropInService;
import com.adyen.checkout.dropin.service.DropInServiceResult;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableMap;

import org.json.JSONException;
import org.json.JSONObject;

public class AdyenDropInService extends DropInService implements DropInServiceProxy.DropInModuleListener {

    private static final String TAG = "AdyenDropInService";

    @Override
    public void onCreate() {
        super.onCreate();
        DropInServiceProxy.shared.setModuleListener(this);
    }

    @Override
    protected void onPaymentsCallRequested(@NonNull PaymentComponentState<?> paymentComponentState, @NonNull JSONObject paymentComponentJson) {
        final DropInServiceProxy.DropInServiceListener listener = DropInServiceProxy.shared.getServiceListener();
        if (listener != null) {
            listener.onDidSubmit(paymentComponentJson);
        }
    }

    @Override
    protected void onDetailsCallRequested(@NonNull ActionComponentData actionComponentData, @NonNull JSONObject actionComponentJson) {
        final DropInServiceProxy.DropInServiceListener listener = DropInServiceProxy.shared.getServiceListener();
        if (listener != null) {
            listener.onDidProvide(actionComponentJson);
        }
    }

    @Override
    public void onAction(JSONObject jsonObject) {
        sendResult(new DropInServiceResult.Action(jsonObject.toString()));
    }

    @Override
    public void onFail(JSONObject message) {
        Log.d(TAG, message.toString());
        sendResult(new DropInServiceResult.Error("Error", message.toString(), true));
    }

    @Override
    public void onComplete(String message) {
        Log.d(TAG, message);
        sendResult(new DropInServiceResult.Finished(message));
    }

}
