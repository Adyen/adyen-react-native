package com.adyenreact;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.DialogFragment;
import androidx.fragment.app.FragmentManager;

import com.adyen.checkout.card.CardComponent;
import com.adyen.checkout.card.CardConfiguration;
import com.adyen.checkout.card.CardView;
import com.adyen.checkout.components.ActionComponentData;
import com.adyen.checkout.components.model.PaymentMethodsApiResponse;
import com.adyen.checkout.components.model.paymentmethods.PaymentMethod;
import com.adyen.checkout.components.model.payments.Amount;
import com.adyen.checkout.components.model.payments.request.PaymentComponentData;
import com.adyen.checkout.components.model.payments.response.Action;
import com.adyen.checkout.core.api.Environment;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import com.adyenreact.PaymentComponentListener;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

public class AdyenCardComponent extends ReactContextBaseJavaModule implements PaymentComponentListener, ActionHandlingInterface {

    public final String TAG = "AdyenCardComponent";
    public final String PAYMENT_METHOD_KEY = "scheme";
    private final String DID_SUBMIT = "didSubmitCallback";
    private final String DID_FAILED = "didFailCallback";
    private final String DID_PROVIDE = "didProvideCallback";
    private final String DID_COMPLEATE = "didCompleteCallback";

    private ActionHandler actionHandler;

    private DialogFragment dialog;

    AdyenCardComponent(ReactApplicationContext context) {
        super(context);
    }

    @NonNull
    @Override
    public String getName() {
        return "AdyenCardComponent";
    }

    @ReactMethod
    public void open(ReadableMap paymentMethods, ReadableMap configuration) {
        PaymentMethodsApiResponse paymentMethodsResponse;
        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(paymentMethods);
            paymentMethodsResponse = PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return;
        }

        PaymentMethod paymentMethod = getPaymentMethod(paymentMethodsResponse);

        ConfigurationParser config = new ConfigurationParser(configuration);
        final Environment environment;
        final String clientKey;
        final Locale shopperLocale;
        final Amount amount;
        final String shopperReference;

        try {
            environment = config.getEnvironment();
            clientKey = config.getClientKey();
            shopperLocale = config.getLocale();
            amount = config.getAmount();
            shopperReference = config.getShopperReference();
        } catch (NoSuchFieldException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
            return;
        }

        actionHandler = new ActionHandler(this, new ActionHandlerConfiguration(shopperLocale, environment, clientKey));

        CardConfiguration componentConfiguration;
        componentConfiguration = new CardConfiguration.Builder(shopperLocale, environment, clientKey)
                .setShopperReference(shopperReference)
                .build();

        AppCompatActivity theActivity = getAppCompatActivity();
        ComponentViewModel viewModel = new ComponentViewModel(paymentMethod, shopperLocale, amount);
        viewModel.setListener(this);

        theActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                showComponentView(theActivity, viewModel, componentConfiguration);
            }
        });
    }

    @ReactMethod
    public void handle(ReadableMap actionMap) {
        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(actionMap);
            Action action = Action.SERIALIZER.deserialize(jsonObject);
            actionHandler.handleAction(getAppCompatActivity(), action);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
        }
    }

    @ReactMethod
    public void hide(Boolean success, ReadableMap message) {
        if (dialog == null) { return; }

        Log.d(TAG, "Closing component");
        dialog.dismiss();
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Set up any upstream listeners or background tasks as necessary
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Remove upstream listeners, stop unnecessary background tasks
    }

    @Nullable
    private PaymentMethod getPaymentMethod(PaymentMethodsApiResponse paymentMethodsResponse) {
        PaymentMethod sepaPaymentMethod = null;
        for (PaymentMethod paymentMethod : paymentMethodsResponse.getPaymentMethods()) {
            Log.d(TAG, paymentMethod.getType());
            if (paymentMethod.getType().equals(PAYMENT_METHOD_KEY)) {
                sepaPaymentMethod = paymentMethod;
                break;
            }
        }

        if (sepaPaymentMethod == null) {
            sendEvent(DID_FAILED, ReactNativeError.mapError("Payment methods does not contain " + PAYMENT_METHOD_KEY));
            return null;
        }
        return sepaPaymentMethod;
    }

    @Nullable
    private AppCompatActivity getAppCompatActivity() {
        Activity currentActivity = getReactApplicationContext().getCurrentActivity();
        AppCompatActivity theActivity = (AppCompatActivity) currentActivity;
        if (theActivity == null) {
            sendEvent(DID_FAILED, ReactNativeError.mapError("Not an AppCompact Activity"));
            return null;
        }
        return theActivity;
    }

    private void showComponentView(AppCompatActivity theActivity,
                                   ComponentViewModel viewModel,
                                   CardConfiguration configuration) {

        CardView componentView = new CardView(theActivity);
        CardComponent component = CardComponent.getPROVIDER().get(theActivity, viewModel.getPaymentMethod(), configuration);

        FragmentManager fragmentManager = theActivity.getSupportFragmentManager();

        dialog = new AdyenBottomSheetDialogFragment(viewModel, componentView, component);
        dialog.show(fragmentManager, "Component");
    }

    private void sendEvent(@NonNull String eventName, @Nullable ReadableMap map) {
        getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, map);
    }

    @Override
    public void onError(Exception exception) {
        sendEvent(DID_FAILED, ReactNativeError.mapError(exception));
    }

    @Override
    public void onSubmit(PaymentComponentData data) {

        JSONObject jsonObject = PaymentComponentData.SERIALIZER.serialize(data);
        try {
            ReadableMap map = ReactNativeJson.convertJsonToMap(jsonObject);
            Log.d(TAG, "Paying");
            sendEvent(DID_SUBMIT, map);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
        }
    }

    @Override
    public void provide(@NonNull ActionComponentData actionComponentData) {
        JSONObject jsonObject = ActionComponentData.SERIALIZER.serialize(actionComponentData);
        try {
            WritableMap map = ReactNativeJson.convertJsonToMap(jsonObject);
            sendEvent(DID_PROVIDE, map);
        } catch (JSONException e) {
            sendEvent(DID_FAILED, ReactNativeError.mapError(e));
        }

    }

    @Override
    public void onClose() {
        sendEvent(DID_FAILED, ReactNativeError.mapError("Closed"));
    }

    @Override
    public void onFinish() {
        sendEvent(DID_COMPLEATE, null);
    }
}