/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration;

import android.util.Log;

import androidx.annotation.NonNull;

import com.adyen.checkout.components.model.payments.Amount;
import com.adyen.checkout.core.api.Environment;
import com.adyen.checkout.core.exception.CheckoutException;
import com.adyenreactnativesdk.ReactNativeJson;
import com.facebook.react.bridge.ReadableMap;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

import javax.annotation.Nullable;

final public class RootConfigurationParser {

    final String TAG = "ConfigurationParser";

    final String AMOUNT_KEY = "amount";
    final String CLIENT_KEY_KEY = "clientKey";
    final String COUNTRY_CODE_KEY = "countryCode";
    final String ENVIRONMENT_KEY = "environment";
    final String SHOPPER_LOCALE_KEY = "shopperLocale";
    final String SHOPPER_REFERENCE_KEY = "shopperReference";

    private final ReadableMap config;

    public RootConfigurationParser(ReadableMap config) {
        this.config = config;
    }

    @Nullable
    public Amount getAmount() {
        ReadableMap map = config.getMap(AMOUNT_KEY);
        if (map == null) {
            Log.w(TAG, "No `amount` on configuration");
            return null;
        }

        JSONObject jsonObject = null;
        try {
            jsonObject = ReactNativeJson.convertMapToJson(map);
        } catch (CheckoutException | JSONException e) {
            Log.w(TAG, "Amount" + map.toString() + " not valid", e);
            return null;
        }
        return Amount.SERIALIZER.deserialize(jsonObject);
    }


    @NonNull
    public String getClientKey() throws NoSuchFieldException {
        String value = config.getString(CLIENT_KEY_KEY);
        if (value == null) {
            throw new NoSuchFieldException("No " + CLIENT_KEY_KEY);
        }

        return value;
    }

    @Nullable
    public String getCountryCode() throws NoSuchFieldException {
        return config.getString(COUNTRY_CODE_KEY);
    }

    @Nullable
    public String getShopperReference() {
        return config.getString(SHOPPER_REFERENCE_KEY);
    }

    @NonNull
    public Locale getLocale() throws NoSuchFieldException {
        String value = config.getString(SHOPPER_LOCALE_KEY);
        if (value == null) {
            throw new NoSuchFieldException("No " + SHOPPER_LOCALE_KEY);
        }

        return Locale.forLanguageTag(value);
    }

    @NonNull
    public Environment getEnvironment() throws NoSuchFieldException {
        String environment = config.getString(ENVIRONMENT_KEY);
        if (environment == null) {
            throw new NoSuchFieldException("No " + ENVIRONMENT_KEY);
        }

        switch (environment.toLowerCase()) {
            case "live-au":
                return Environment.AUSTRALIA;
            case "live":
            case "live-eu":
                return Environment.EUROPE;
            case "live-us":
                return Environment.UNITED_STATES;
            default:
                return Environment.TEST;
        }
    }
}
