/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk;

import android.util.Log;

import androidx.annotation.NonNull;

import com.adyen.checkout.components.ActionComponentData;
import com.adyen.checkout.components.PaymentComponentState;
import com.adyen.checkout.dropin.service.DropInService;
import com.adyen.checkout.dropin.service.DropInServiceResult;
import com.facebook.react.bridge.ReadableMap;

import org.json.JSONObject;

public class AdyenDropInService extends DropInService implements DropInServiceProxy.DropInModuleListener {

    private static final String TAG = "AdyenDropInService";
    private static final String MESSAGE_KEY = "message";
    private static final String DESCRIPTION_KEY = "description";

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
        } else {
            Log.e(TAG, "Invalid state: DropInServiceListener is missing");
        }
    }

    @Override
    protected void onDetailsCallRequested(@NonNull ActionComponentData actionComponentData, @NonNull JSONObject actionComponentJson) {
        final DropInServiceProxy.DropInServiceListener listener = DropInServiceProxy.shared.getServiceListener();
        if (listener != null) {
            listener.onDidProvide(actionComponentJson);
        } else {
            Log.e(TAG, "Invalid state: DropInServiceListener is missing");
        }
    }

    @Override
    public void onAction(JSONObject jsonObject) {
        sendResult(new DropInServiceResult.Action(jsonObject.toString()));
    }

    @Override
    public void onFail(ReadableMap map) {
        String message = map.getString(MESSAGE_KEY);
        String description = map.getString(DESCRIPTION_KEY);
        sendResult(new DropInServiceResult.Error(message, description, true));
    }

    @Override
    public void onComplete(ReadableMap map) {
        String message = map.getString(MESSAGE_KEY);
        sendResult(new DropInServiceResult.Finished(message));
    }

}
