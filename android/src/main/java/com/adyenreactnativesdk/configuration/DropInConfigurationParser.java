package com.adyenreactnativesdk.configuration;

import com.facebook.react.bridge.ReadableMap;

final public class DropInConfigurationParser {

    final String TAG = "DropInConfigurationParser";

    final String DROPIN_KEY = "dropin";
    final String SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY = "showPreselectedStoredPaymentMethod";
    final String SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY = "skipListWhenSinglePaymentMethod";

    private final ReadableMap config;

    public DropInConfigurationParser(ReadableMap config) {
        if (config.hasKey(DROPIN_KEY)) {
            this.config = config.getMap(DROPIN_KEY);
        } else {
            this.config = config;
        }
    }
    
    public boolean getSkipListWhenSinglePaymentMethod() {
        return config.getBoolean(SKIP_LIST_WHEN_SINGLE_PAYMENT_METHOD_KEY);
    }

    public boolean getShowPreselectedStoredPaymentMethod() {
        if(config.hasKey(SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY)) {
            return config.getBoolean(SHOW_PRESELECTED_STORED_PAYMENT_METHOD_KEY);
        }
        return true;
    }
}
