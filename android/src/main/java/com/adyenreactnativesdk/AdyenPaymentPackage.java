/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk;

import com.adyenreactnativesdk.component.card.AdyenCardComponent;
import com.adyenreactnativesdk.component.dropin.AdyenDropInComponent;
import com.adyenreactnativesdk.component.instant.AdyenInstantComponent;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AdyenPaymentPackage implements ReactPackage {

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new AdyenDropInComponent(reactContext));
        modules.add(new AdyenCardComponent(reactContext));
        modules.add(new AdyenInstantComponent(reactContext));
        return modules;
    }

}
