package com.adyenreact;

import com.adyen.checkout.core.api.Environment;

public class DropInConfigHelper {

    static public Environment parseEnvironment(String string) {
        switch (string.toLowerCase()) {
            case "live_europe":
            case "live":
                return Environment.EUROPE;
            case "live_us":
                return Environment.UNITED_STATES;
            case "live_australia":
                return Environment.AUSTRALIA;
            default:
                return Environment.TEST;
        }
    }
}
