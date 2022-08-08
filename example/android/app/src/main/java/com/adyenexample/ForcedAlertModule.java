package com.adyenexample;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.app.FragmentManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.fragment.app.DialogFragment;

import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.NativeModule;
        import com.facebook.react.bridge.ReactApplicationContext;
        import com.facebook.react.bridge.ReactContext;
        import com.facebook.react.bridge.ReactContextBaseJavaModule;
        import com.facebook.react.bridge.ReactMethod;
        import java.util.Map;
        import java.util.HashMap;

public class ForcedAlertModule extends ReactContextBaseJavaModule {

    public static final String CLOSE = "yourPackageName.CLOSE";

    ForcedAlertModule(ReactApplicationContext context) {
        super(context);
    }

    Intent dialogIntent;

    @NonNull
    @Override
    public String getName() {
        return "ForcedAlertModule";
    }

    protected static Callback onCancel;
    protected static Callback onAgree;

    @ReactMethod
    public void alert(String title, String message, Callback cancelCallBack, Callback okCallBack) {
        onCancel = cancelCallBack;
        onAgree = okCallBack;
        Intent dialogIntent = new Intent(getReactApplicationContext(), AlertDialogActivity.class);
        dialogIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        dialogIntent.putExtra("title", title);
        dialogIntent.putExtra("message", message);
        getCurrentActivity().getApplication().startActivity(dialogIntent);
    }
}

