/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk;

import android.app.Activity;
import android.content.Intent;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adyen.checkout.adyen3ds2.Adyen3DS2Configuration;
import com.adyen.checkout.bcmc.BcmcConfiguration;
import com.adyen.checkout.card.CardConfiguration;
import com.adyen.checkout.components.model.PaymentMethodsApiResponse;
import com.adyen.checkout.components.model.payments.Amount;
import com.adyen.checkout.core.api.Environment;
import com.adyen.checkout.dropin.DropIn;
import com.adyen.checkout.dropin.DropInConfiguration;
import com.adyen.checkout.googlepay.GooglePayConfiguration;
import com.adyen.checkout.redirect.RedirectComponent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

public class AdyenDropInModule extends BaseModule implements DropInServiceProxy.DropInServiceListener {

    private final String TAG = "AdyenDropInModule";

    AdyenDropInModule(ReactApplicationContext context) {
        super(context);
        DropInServiceProxy.shared.setServiceListener(this);
    }

    @Override
    public String getName() {
        return "AdyenDropIn";
    }

    @ReactMethod
    public void open(ReadableMap paymentMethodsData, ReadableMap configuration) {
        PaymentMethodsApiResponse paymentMethodsResponse = getPaymentMethodsApiResponse(paymentMethodsData);
        if (paymentMethodsResponse == null) return;

        ConfigurationParser config = new ConfigurationParser(configuration);
        final Environment environment;
        final String clientKey;
        final Locale shopperLocale;
        final String countryCode;
        final String shopperReference;
        final Amount amount = config.getAmount();
        final Boolean showStorePaymentField;
        final Boolean hideCvc;
        final Boolean holderNameRequired;

        try {
            environment = config.getEnvironment();
            clientKey = config.getClientKey();
            shopperLocale = config.getLocale();
            shopperReference = config.getShopperReference();
            countryCode = config.getCountryCode();
            showStorePaymentField = config.getShowStorePaymentField();
            hideCvc = config.getHideCvc();
            holderNameRequired = config.getHolderNameRequired();

        } catch (NoSuchFieldException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return;
        }

        DropInConfiguration.Builder builder;
        builder = new DropInConfiguration.Builder(getReactApplicationContext(), AdyenDropInService.class, clientKey)
                .setShopperLocale(shopperLocale)
                .setEnvironment(environment);

        CardConfiguration cardConfiguration;
        cardConfiguration = new CardConfiguration.Builder(shopperLocale, environment, clientKey)
                .setShopperReference(shopperReference)
                .setShowStorePaymentField(showStorePaymentField)
                .setHideCvc(hideCvc)
                .setHolderNameRequired(holderNameRequired)
                .build();

        BcmcConfiguration bcmcConfiguration;
        bcmcConfiguration = new BcmcConfiguration.Builder(shopperLocale, environment, clientKey)
                .setShopperReference(shopperReference)
                .setShowStorePaymentField(true)
                .build();

        Adyen3DS2Configuration adyen3DS2Configuration;
        adyen3DS2Configuration = new Adyen3DS2Configuration.Builder(shopperLocale, environment, clientKey)
                .build();

        builder.addCardConfiguration(cardConfiguration)
                .add3ds2ActionConfiguration(adyen3DS2Configuration)
                .addBcmcConfiguration(bcmcConfiguration);

        if (amount != null) {
            GooglePayConfiguration googlePayConfig;
            googlePayConfig = new GooglePayConfiguration.Builder(shopperLocale, environment, clientKey)
                    .setCountryCode(countryCode)
                    .setAmount(amount)
                    .build();

            builder.setAmount(amount)
                    .addGooglePayConfiguration(googlePayConfig);
        }

        Activity currentActivity = getReactApplicationContext().getCurrentActivity();
        Intent resultIntent = new Intent(currentActivity, currentActivity.getClass());
        resultIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

        DropIn.startPayment(currentActivity, paymentMethodsResponse, builder.build(), resultIntent);
    }

    @ReactMethod
    public void handle(ReadableMap actionMap) {

        final DropInServiceProxy.DropInModuleListener listener = DropInServiceProxy.shared.getModuleListener();
        if (listener == null) {
            IllegalStateException e = new IllegalStateException("Invalid state: DropInModuleListener is missing");
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return;
        }

        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(actionMap);
            listener.onAction(jsonObject);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
        }
    }

    @ReactMethod
    public void hide(Boolean success, ReadableMap message) {
        proxyHideDropInCommand(success, message);
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Set up any upstream listeners or background tasks as necessary
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Remove upstream listeners, stop unnecessary background tasks
    }

    @Override
    public void onDidSubmit(@NonNull JSONObject jsonObject) {
        WritableMap map = null;
        try {
            map = ReactNativeJson.convertJsonToMap(jsonObject);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return;
        }

        final ReactApplicationContext context = getReactApplicationContext();
        map.putString("returnUrl", RedirectComponent.getReturnUrl(context));
        sendEvent(DID_SUBMIT, map);
    }

    @Override
    public void onDidProvide(@NonNull JSONObject jsonObject) {
        try {
            WritableMap map = ReactNativeJson.convertJsonToMap(jsonObject);
            sendEvent(DID_PROVIDE, map);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
        }
    }

    private void proxyHideDropInCommand(Boolean success, @Nullable ReadableMap message) {
        final DropInServiceProxy.DropInModuleListener listener = DropInServiceProxy.shared.getModuleListener();
        if (listener == null) {
            IllegalStateException e = new IllegalStateException("Invalid state: DropInModuleListener is missing");
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return;
        }

        if (success) {
            listener.onComplete(message);
        } else {
            listener.onFail(message);
        }
    }

}
