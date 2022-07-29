/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration;

import android.util.Log;

import androidx.annotation.NonNull;

import com.adyen.checkout.bcmc.BcmcConfiguration;
import com.adyen.checkout.card.CardConfiguration;
import com.adyen.checkout.card.KCPAuthVisibility;
import com.adyen.checkout.card.SocialSecurityNumberVisibility;
import com.adyen.checkout.card.data.CardType;
import com.adyen.checkout.components.base.AddressVisibility;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import java.util.ArrayList;
import java.util.List;

final public class CardConfigurationParser {

    final String TAG = "CardConfigurationParser";

    final String CARD_KEY = "card";
    final String SHOW_STORE_PAYMENT_FIELD_KEY = "showStorePaymentField";
    final String HOLDER_NAME_REQUIRED_KEY = "holderNameRequired";
    final String HIDE_CVC_STORED_CARD_KEY = "hideCvcStoredCard";
    final String HIDE_CVC_KEY = "hideCvc";
    final String ADDRESS_VISIBILITY_KEY = "addressVisibility";
    final String KCP_VISIBILITY_KEY = "kcpVisibility";
    final String SOCIAL_SECURITY_VISIBILITY_KEY = "socialSecurity";
    final String SUPPORTED_CARD_TYPES_KEY = "supported";
    private final ReadableMap config;

    public CardConfigurationParser(ReadableMap config) {
        if (config.hasKey(CARD_KEY)) {
            this.config = config.getMap(CARD_KEY);
        } else {
            this.config = config;
        }
    }

    @NonNull
    public CardConfiguration getConfiguration(CardConfiguration.Builder builder) {
        if(config.hasKey(SUPPORTED_CARD_TYPES_KEY)) {
            builder.setSupportedCardTypes(getSupportedCardTypes());
        }

        return builder
                .setShowStorePaymentField(getShowStorePaymentField())
                .setHideCvcStoredCard(getHideCvcStoredCard())
                .setHideCvc(getHideCvc())
                .setHolderNameRequired(getHolderNameRequired())
                .setAddressVisibility(getAddressVisibility())
                .setKcpAuthVisibility(getKcpVisibility())
                .setSocialSecurityNumberVisibility(getSocialSecurityNumberVisibility())
                .build();
    }

    public BcmcConfiguration getConfiguration(BcmcConfiguration.Builder builder) {
        return builder
                .setShowStorePaymentField(getShowStorePaymentField())
                .build();
    }

    @NonNull
    private Boolean getShowStorePaymentField() {
        if(config.hasKey(SHOW_STORE_PAYMENT_FIELD_KEY)) {
            return config.getBoolean(SHOW_STORE_PAYMENT_FIELD_KEY);
        }
        return true;
    }

    @NonNull
    private Boolean getHolderNameRequired() {
        if(config.hasKey(HOLDER_NAME_REQUIRED_KEY)) {
            return config.getBoolean(HOLDER_NAME_REQUIRED_KEY);
        }
        return false;
    }

    @NonNull
    private Boolean getHideCvcStoredCard() {
        if(config.hasKey(HIDE_CVC_STORED_CARD_KEY)) {
            return config.getBoolean(HIDE_CVC_STORED_CARD_KEY);
        }
        return true;
    }

    @NonNull
    private Boolean getHideCvc() {
        if(config.hasKey(HIDE_CVC_KEY)) {
            return config.getBoolean(HIDE_CVC_KEY);
        }
        return true;
    }

    @NonNull
    private KCPAuthVisibility getKcpVisibility() {
        if(config.hasKey(KCP_VISIBILITY_KEY)) {
            String value = config.getString(KCP_VISIBILITY_KEY);
            switch (value.toLowerCase()) {
                case "show":
                    return KCPAuthVisibility.SHOW;
                default:
                    return KCPAuthVisibility.HIDE;
            }
        }
        return KCPAuthVisibility.HIDE;
    }

    @NonNull
    private AddressVisibility getAddressVisibility() {
        if(config.hasKey(ADDRESS_VISIBILITY_KEY)) {
            String value = config.getString(ADDRESS_VISIBILITY_KEY);
            switch (value.toLowerCase()) {
                case "postal_code":
                case "postal":
                case "postalcode":
                    return AddressVisibility.POSTAL_CODE;
                default:
                    return AddressVisibility.NONE;
            }
        }
        return AddressVisibility.NONE;
    }

    @NonNull
    private CardType[] getSupportedCardTypes() {
        ReadableArray array = config.getArray(SUPPORTED_CARD_TYPES_KEY);
        int size = array.size();
        List<CardType> list = new ArrayList<CardType>(size);
        for (int i = 0; i < size; i++) {
            String brandName = array.getString(i);
            CardType type = CardType.getByBrandName(brandName);
            if(type != null) {
                list.add(type);
            } else {
                Log.w(TAG, "CardType not recognized: " + brandName);
            }
        }
        return (CardType[])list.toArray();
    }

    @NonNull
    private SocialSecurityNumberVisibility getSocialSecurityNumberVisibility() {
        if(config.hasKey(SOCIAL_SECURITY_VISIBILITY_KEY)) {
            String value = config.getString(SOCIAL_SECURITY_VISIBILITY_KEY);
            switch (value.toLowerCase()) {
                case "show":
                    return SocialSecurityNumberVisibility.SHOW;
                default:
                    return SocialSecurityNumberVisibility.HIDE;
            }
        }
        return SocialSecurityNumberVisibility.HIDE;
    }

    // TODO: add InstallmentConfiguration getInstallmentConfiguration

}
