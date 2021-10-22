package com.adytestios;

import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResultLauncher;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.adyen.checkout.components.model.PaymentMethodsApiResponse;
import com.adyen.checkout.components.model.payments.Amount;
import com.adyen.checkout.core.api.Environment;
import com.adyen.checkout.core.exception.CheckoutException;
import com.adyen.checkout.core.log.Logger;
import com.adyen.checkout.dropin.DropIn;
import com.adyen.checkout.dropin.DropInConfiguration;
import com.adyen.checkout.redirect.RedirectComponent;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class AdyenDropInModule extends ReactContextBaseJavaModule implements DropInServiceProxy.DropInServiceListener {

    private final String TAG = "AdyenDropInModule";

    private ActivityResultLauncher<Intent> dropInLauncher;

    AdyenDropInModule(ReactApplicationContext context) {
        super(context);
        DropInServiceProxy.shared.setServiceListener(this);
    }

    @Override
    public String getName() {
        return "AdyenDropIn";
    }

    @Override
    public Map<String, Object> getConstants() {
        final Map<String, Object> constants = new HashMap<>();
        constants.put("CHANNEL", "Android");
        return constants;
    }

    @ReactMethod
    public void openDropIn(ReadableMap paymentMethods, ReadableMap configuration) {
        Log.d(TAG, "open DropIn for " + configuration.toString() );
        PaymentMethodsApiResponse paymentMethodsResponse;
        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(paymentMethods);
            paymentMethodsResponse = PaymentMethodsApiResponse.SERIALIZER.deserialize(jsonObject);
        } catch (JSONException e) {
            e.printStackTrace();
            return;
        }
        String clientKey = configuration.getString("clientKey");

        DropInConfiguration.Builder builder = new DropInConfiguration.Builder(
                getReactApplicationContext(),
                MyDropInService.class,
                clientKey);

        final String environmentName = configuration.getString("environment");
        Environment environment = DropInConfigHelper.parseEnvironment(environmentName);
        builder.setEnvironment(environment);

        ReadableMap map = configuration.getMap("amount");
        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(map);
            Amount amount = Amount.SERIALIZER.deserialize(jsonObject);
            builder.setAmount(amount);
        } catch (CheckoutException | JSONException e) {
            Log.w(TAG, "Amount" + map.toString() + " not valid", e);
        }

        Activity currentActivity = getReactApplicationContext().getCurrentActivity();

        Intent resultIntent = new Intent(currentActivity, MainActivity.class);
        resultIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        Logger.setLogcatLevel(Log.DEBUG);

        DropIn.startPayment(currentActivity, paymentMethodsResponse, builder.build(), resultIntent);
    }

    @ReactMethod
    public void handle(ReadableMap actionMap) {
        Log.d(TAG, "action received");

        final DropInServiceProxy.DropInModuleListener listener = DropInServiceProxy.shared.getModuleListener();
        if (listener == null) {
            sendEvent("didFailed", null);
            return;
        }

        try {
            JSONObject jsonObject = ReactNativeJson.convertMapToJson(actionMap);
            listener.onAction(jsonObject);
        } catch (JSONException e) {
            e.printStackTrace();
            sendEvent("didFailed", null);
        }
    }

    @ReactMethod
    public void hideDropIn() {
        Log.d(TAG, "hide DropIn");
        proxyHideDropInCommand("Dismissed");
    }

    @ReactMethod
    public void addListener(String eventName) {
        // Set up any upstream listeners or background tasks as necessary
    }

    @ReactMethod
    public void removeListeners(Integer count) {
        // Remove upstream listeners, stop unnecessary background tasks
    }

    @Override
    public void onDidSubmit(@NonNull JSONObject jsonObject) {
        WritableMap map = null;
        try {
            map = ReactNativeJson.convertJsonToMap(jsonObject);
        } catch (JSONException e) {
            e.printStackTrace();
            sendEvent("didFailed", null);
        }

        final ReactApplicationContext context = getReactApplicationContext();
        map.putString("returnUrl", RedirectComponent.getReturnUrl(context));
        sendEvent("didSubmitCallback", map);
    }

    @Override
    public void onDidProvide(@NonNull JSONObject jsonObject) {
        try {
            WritableMap map = ReactNativeJson.convertJsonToMap(jsonObject);
            sendEvent("didCompleteCallback", map);
        } catch (JSONException e) {
            e.printStackTrace();
            sendEvent("didFailed", null);
        }
    }

    private void proxyHideDropInCommand(@Nullable String message) {
        final DropInServiceProxy.DropInModuleListener listener = DropInServiceProxy.shared.getModuleListener();
        if (listener != null) {
            listener.onComplete(message);
        }
    }

    private void sendEvent(String eventName, ReadableMap map) {
        getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, map);
    }

        /*
        val shopperLocaleString = keyValueStorage.getShopperLocale()
        val shopperLocale = LocaleUtil.fromLanguageTag(shopperLocaleString)

        val amount = keyValueStorage.getAmount()

        val cardConfiguration = CardConfiguration.Builder(shopperLocale, Environment.TEST, BuildConfig.CLIENT_KEY)
                .setShopperReference(keyValueStorage.getShopperReference())
                .build()

        val googlePayConfig = GooglePayConfiguration.Builder(shopperLocale, Environment.TEST, BuildConfig.CLIENT_KEY)
                .setCountryCode(keyValueStorage.getCountry())
                .setAmount(amount)
                .build()

        val bcmcConfiguration = BcmcConfiguration.Builder(shopperLocale, Environment.TEST, BuildConfig.CLIENT_KEY)
                .setShopperReference(keyValueStorage.getShopperReference())
                .setShowStorePaymentField(true)
                .build()

        val adyen3DS2Configuration = Adyen3DS2Configuration.Builder(shopperLocale, Environment.TEST, BuildConfig.CLIENT_KEY)
                .build()

        val dropInConfigurationBuilder = DropInConfiguration.Builder(
                this@MainActivity,
        ExampleDropInService::class.java,
                BuildConfig.CLIENT_KEY
        )
            .setEnvironment(Environment.TEST)
                .setShopperLocale(shopperLocale)
                .addCardConfiguration(cardConfiguration)
                .addBcmcConfiguration(bcmcConfiguration)
                .addGooglePayConfiguration(googlePayConfig)
                .add3ds2ActionConfiguration(adyen3DS2Configuration)

    */

    /*
        //RCT_EXTERN_METHOD(setDidCancel:(RCTResponseSenderBlock)didCancelCallback)
        //RCT_EXTERN_METHOD(setDidOpenExternalApplication:(RCTResponseSenderBlock)didOpenExternalApplicationCallback)
    *
    * */
}
