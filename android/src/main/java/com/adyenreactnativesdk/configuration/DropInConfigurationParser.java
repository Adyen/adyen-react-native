package com.adyenreactnativesdk.configuration;

import androidx.annotation.NonNull;

import com.adyen.checkout.components.base.AddressVisibility;
import com.facebook.react.bridge.ReadableMap;

final public class DropInConfigurationParser {

    final String TAG = "DropInConfigurationParser";

    final String DROPIN_KEY = "dropin";
    final String SHOWPRESELECTEDSTOREDPAYMENTMETHOD_KEY = "showPreselectedStoredPaymentMethod";
    final String SKIPLISTWHENSINGLEPAYMENTMETHOD_KEY = "skipListWhenSinglePaymentMethod";

    private final ReadableMap config;

    public DropInConfigurationParser(ReadableMap config) {
        if (config.hasKey(DROPIN_KEY)) {
            this.config = config.getMap(DROPIN_KEY);
        } else {
            this.config = config;
        }
    }
    
    public boolean getSkipListWhenSinglePaymentMethod() {
        return config.getBoolean(SKIPLISTWHENSINGLEPAYMENTMETHOD_KEY);
    }

    public boolean getShowPreselectedStoredPaymentMethod() {
        if(config.hasKey(SHOWPRESELECTEDSTOREDPAYMENTMETHOD_KEY)) {
            return config.getBoolean(SHOWPRESELECTEDSTOREDPAYMENTMETHOD_KEY);
        }
        return true;
    }
}
