/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReadableMap;

import org.json.JSONObject;

import java.lang.ref.WeakReference;


public class DropInServiceProxy {

    public static DropInServiceProxy shared = new DropInServiceProxy();
    @Nullable
    private WeakReference<DropInServiceListener> serviceListener;
    @Nullable
    private WeakReference<DropInModuleListener> moduleListener;

    private DropInServiceProxy() {
    }

    @Nullable
    public DropInServiceListener getServiceListener() {
        if (serviceListener != null) return serviceListener.get();
        else return null;
    }

    public void setServiceListener(@NonNull DropInServiceListener serviceListener) {
        this.serviceListener = new WeakReference<DropInServiceListener>(serviceListener);
    }

    @Nullable
    public DropInModuleListener getModuleListener() {
        if (moduleListener != null) return moduleListener.get();
        else return null;
    }

    public void setModuleListener(@NonNull DropInModuleListener moduleListener) {
        this.moduleListener = new WeakReference<DropInModuleListener>(moduleListener);
    }

    public interface DropInServiceListener {

        void onDidSubmit(@NonNull JSONObject jsonObject);

        void onDidProvide(@NonNull JSONObject jsonObject);

    }

    public interface DropInModuleListener {

        void onAction(@NonNull JSONObject jsonObject);

        void onFail(@Nullable ReadableMap map);

        void onComplete(@Nullable ReadableMap message);

    }

}
