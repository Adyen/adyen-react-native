package com.adyenreact;

import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adyen.checkout.dropin.service.DropInServiceResult;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReadableMap;

import org.json.JSONException;
import org.json.JSONObject;

import java.lang.ref.WeakReference;


public class DropInServiceProxy {

    @Nullable
    private WeakReference<DropInServiceListener> serviceListener;

    @Nullable
    private WeakReference<DropInModuleListener> moduleListener;

    public static DropInServiceProxy shared = new DropInServiceProxy();

    private DropInServiceProxy() { }

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

        public void onDidSubmit(@NonNull JSONObject jsonObject);

        public void onDidProvide(@NonNull JSONObject jsonObject);
        
    }

    public interface DropInModuleListener {

        public void onAction(@NonNull JSONObject jsonObject);

        public void onFail(JSONObject jsonObject);

        public void onComplete(@Nullable String message);

    }

}
