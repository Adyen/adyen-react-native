/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration;

import androidx.annotation.NonNull;

import com.adyen.checkout.components.base.AddressVisibility;
import com.facebook.react.bridge.ReadableMap;

final public class CardConfigurationParser {

    final String TAG = "CardConfigurationParser";

    final String CARD_KEY = "card";
    final String SHOWSTOREPAYMENTFIELD_KEY = "showStorePaymentField";
    final String HOLDERNAMEREQUIRED_KEY = "holderNameRequired";
    final String HIDECVCSTOREDCARD_KEY = "hideCvcStoredCard";
    final String HIDECVC_KEY = "hideCvc";
    final String ADDRESSVISIBILITY_KEY = "addressVisibility";
    private final ReadableMap config;

    public CardConfigurationParser(ReadableMap config) {
        if (config.hasKey(CARD_KEY)) {
            this.config = config.getMap(CARD_KEY);
        } else {
            this.config = config;
        }
    }

    @NonNull
    public Boolean getShowStorePaymentField() {
        if(config.hasKey(SHOWSTOREPAYMENTFIELD_KEY)) {
            return config.getBoolean(SHOWSTOREPAYMENTFIELD_KEY);
        }
        return true;
    }

    @NonNull
    public Boolean getHolderNameRequired() {
        return config.getBoolean(HOLDERNAMEREQUIRED_KEY);
    }

    @NonNull
    public Boolean getHideCvcStoredCard() {
        if(config.hasKey(HIDECVCSTOREDCARD_KEY)) {
            return config.getBoolean(HIDECVCSTOREDCARD_KEY);
        }
        return true;
    }

    @NonNull
    public Boolean getHideCvc() {
        if(config.hasKey(HIDECVC_KEY)) {
            return config.getBoolean(HIDECVC_KEY);
        }
        return true;
    }

    @NonNull
    public AddressVisibility getAddressVisibility() {
        if(config.hasKey(ADDRESSVISIBILITY_KEY)) {
            String value = config.getString(ADDRESSVISIBILITY_KEY);
            switch (value.toLowerCase()) {
                case "postal_code":
                    return AddressVisibility.POSTAL_CODE;
                default:
                    return AddressVisibility.NONE;
            }
        }
        return AddressVisibility.NONE;
    }
}
