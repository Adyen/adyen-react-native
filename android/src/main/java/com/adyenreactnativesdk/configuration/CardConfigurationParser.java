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
    final String SHOW_STORE_PAYMENT_FIELD_KEY = "showStorePaymentField";
    final String HOLDER_NAME_REQUIRED_KEY = "holderNameRequired";
    final String HIDE_CVC_STORED_CARD_KEY = "hideCvcStoredCard";
    final String HIDE_CVC_KEY = "hideCvc";
    final String ADDRESS_VISIBILITY_KEY = "addressVisibility";
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
        if(config.hasKey(SHOW_STORE_PAYMENT_FIELD_KEY)) {
            return config.getBoolean(SHOW_STORE_PAYMENT_FIELD_KEY);
        }
        return true;
    }

    @NonNull
    public Boolean getHolderNameRequired() {
        return config.getBoolean(HOLDER_NAME_REQUIRED_KEY);
    }

    @NonNull
    public Boolean getHideCvcStoredCard() {
        if(config.hasKey(HIDE_CVC_STORED_CARD_KEY)) {
            return config.getBoolean(HIDE_CVC_STORED_CARD_KEY);
        }
        return true;
    }

    @NonNull
    public Boolean getHideCvc() {
        if(config.hasKey(HIDE_CVC_KEY)) {
            return config.getBoolean(HIDE_CVC_KEY);
        }
        return true;
    }

    @NonNull
    public AddressVisibility getAddressVisibility() {
        if(config.hasKey(ADDRESS_VISIBILITY_KEY)) {
            String value = config.getString(ADDRESS_VISIBILITY_KEY);
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
