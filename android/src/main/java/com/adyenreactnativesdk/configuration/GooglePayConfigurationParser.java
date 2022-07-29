package com.adyenreactnativesdk.configuration;

import android.util.Log;

import androidx.annotation.NonNull;

import com.adyen.checkout.core.api.Environment;
import com.adyen.checkout.googlepay.GooglePayConfiguration;
import com.adyen.checkout.googlepay.util.AllowedCardNetworks;
import com.facebook.react.bridge.ReadableMap;
import com.google.android.gms.wallet.WalletConstants;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

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

    @NonNull
    private List<String> getAllowedCardNetworks() {
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

    @NonNull
    private List<String> getAllowedAuthMethods() {
        List<Object> list = config.getArray(ALLOWED_AUTH_METHODS_KEY).toArrayList();
        List<String> strings = new ArrayList<>(list.size());
        for (Object object : list) {
            strings.add(Objects.toString(object, null));
        }
        return strings.isEmpty() ? null : strings;
    }

    @NonNull
    private int getGooglePayEnvironment(Environment environment) {
        if(config.hasKey(GOOGLEPAY_ENVIRONMENT_KEY)) {
            return config.getInt(GOOGLEPAY_ENVIRONMENT_KEY);
        }

        if (environment.equals(Environment.TEST)) {
            return WalletConstants.ENVIRONMENT_TEST;
        }

        return WalletConstants.ENVIRONMENT_PRODUCTION;
    }

    @NonNull
    public GooglePayConfiguration getConfiguration(GooglePayConfiguration.Builder builder) {
        builder.setGooglePayEnvironment(getGooglePayEnvironment(builder.getBuilderEnvironment()));

        if (config.hasKey(ALLOWED_AUTH_METHODS_KEY)) {
            builder.setAllowedAuthMethods(getAllowedAuthMethods());
        }

        if (config.hasKey(ALLOWED_CARD_NETWORKS_KEY)) {
            builder.setAllowedCardNetworks(getAllowedCardNetworks());
        }

        if(config.hasKey(ALLOW_PREPAID_CARDS_KEY)) {
            builder.setAllowPrepaidCards(config.getBoolean(ALLOW_PREPAID_CARDS_KEY));
        }

        if(config.hasKey(BILLING_ADDRESS_REQUIRED_KEY)) {
            builder.setBillingAddressRequired(config.getBoolean(BILLING_ADDRESS_REQUIRED_KEY));
        }

        if(config.hasKey(EMAIL_REQUIRED_KEY)) {
            builder.setEmailRequired(config.getBoolean(EMAIL_REQUIRED_KEY));
        }

        if(config.hasKey(SHIPPING_ADDRESS_REQUIRED_KEY)) {
            builder.setShippingAddressRequired(config.getBoolean(SHIPPING_ADDRESS_REQUIRED_KEY));
        }

        if(config.hasKey(EXISTING_PAYMENT_METHOD_REQUIRED_KEY)) {
            builder.setExistingPaymentMethodRequired(config.getBoolean(EXISTING_PAYMENT_METHOD_REQUIRED_KEY));
        }

        if(config.hasKey(MERCHANT_ACCOUNT_KEY)) {
            builder.setMerchantAccount(config.getString(MERCHANT_ACCOUNT_KEY));
        }

        if(config.hasKey(TOTAL_PRICE_STATUS_KEY)) {
            builder.setTotalPriceStatus(config.getString(MERCHANT_ACCOUNT_KEY));
        }

        return  builder.build();
    }

}
