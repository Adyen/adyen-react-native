package com.adyenreactnativesdk.configuration;

import android.util.Log;

import com.adyen.checkout.googlepay.util.AllowedCardNetworks;
import com.facebook.react.bridge.ReadableMap;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import javax.annotation.Nullable;

public class GooglePayConfigurationParser {

    final String TAG = "GooglePayConfigParser";

    final String GOOGLEPAY_KEY = "googlepay";
    final String MERCHANT_ACCOUNT_KEY = "merchantAccount";
    final String ALLOWED_CARD_NETWORKS_KEY = "allowedCardNetworks";
    final String ALLOWED_AUTH_METHODS_KEY = "allowedAuthMethods";
    final String TOTAL_PRICE_STATUS_KEY = "totalPriceStatus";
    final String ALLOW_PREPAID_CARDS_KEY = "allowPrepaidCards";
    final String BILLING_ADDRESS_REQUIRED_KEY = "billingAddressRequired";
    final String EMAIL_REQUIRED_KEY = "emailRequired";
    final String SHIPPING_ADDRESS_REQUIRED_KEY = "shippingAddressRequired";
    final String EXISTING_PAYMENT_METHOD_REQUIRED_KEY = "existingPaymentMethodRequired";
    final String GOOGLEPAY_ENVIRONMENT_KEY = "googlePayEnvironment";


    private final ReadableMap config;

    public GooglePayConfigurationParser(ReadableMap config) {
        if (config.hasKey(GOOGLEPAY_KEY)) {
            this.config = config.getMap(GOOGLEPAY_KEY);
        } else {
            this.config = config;
        }
    }

    public List<String> getAllowedCardNetworks() {
        if (!config.hasKey(ALLOWED_CARD_NETWORKS_KEY)) {
            return null;
        }

        List<Object> list = config.getArray(ALLOWED_CARD_NETWORKS_KEY).toArrayList();
        List<String> strings = new ArrayList<>(list.size());
        Set<String> allowedCardNetworks = new HashSet<>(AllowedCardNetworks.getAllAllowedCardNetworks());
        for (Object object : list) {
            String cardNetwork = Objects.toString(object, null).toUpperCase();
            if (allowedCardNetworks.contains(cardNetwork)) {
                strings.add(cardNetwork);
            } else {
                Log.w(TAG, "skipping brand " + cardNetwork + ", as it is not an allowed card network.");
            }
        }
        return strings.isEmpty() ? null : strings;
    }

    public List<String> getAllowedAuthMethods() {
        if (config.hasKey(ALLOWED_AUTH_METHODS_KEY)) {
            List<Object> list = config.getArray(ALLOWED_AUTH_METHODS_KEY).toArrayList();
            List<String> strings = new ArrayList<>(list.size());
            for (Object object : list) {
                strings.add(Objects.toString(object, null));
            }
            return strings.isEmpty() ? null : strings;
        }
        return null;
    }

    public boolean getAllowPrepaidCards() {
        return config.getBoolean(ALLOW_PREPAID_CARDS_KEY);
    }

    public boolean getBillingAddressRequired() {
        return config.getBoolean(BILLING_ADDRESS_REQUIRED_KEY);
    }

    public boolean getEmailRequired() {
        return config.getBoolean(EMAIL_REQUIRED_KEY);
    }

    public boolean getShippingAddressRequired() {
        return config.getBoolean(SHIPPING_ADDRESS_REQUIRED_KEY);
    }

    public boolean getExistingPaymentMethodRequired() {
        return config.getBoolean(EXISTING_PAYMENT_METHOD_REQUIRED_KEY);
    }

    public int getGooglePayEnvironment() {
        if(config.hasKey(GOOGLEPAY_ENVIRONMENT_KEY)) {
            return config.getInt(GOOGLEPAY_ENVIRONMENT_KEY);
        }
        return 3; // ENVIRONMENT_TEST
    }

    @Nullable
    public String getMerchantAccount() {
        return config.getString(MERCHANT_ACCOUNT_KEY);
    }

    public String getTotalPriceStatus() {
        return config.getString(TOTAL_PRICE_STATUS_KEY);
    }
}
