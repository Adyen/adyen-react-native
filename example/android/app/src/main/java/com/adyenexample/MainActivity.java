package com.adyenexample;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

import com.adyenreactnativesdk.action.ActionHandler;
import com.adyenreactnativesdk.AdyenCheckout;
import com.adyenreactnativesdk.component.googlepay.AdyenGooglePayComponent;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  private static final String TAG = "MainActivity";

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "AdyenExample";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
    Log.d(TAG, "onCreate");
    AdyenCheckout.setLauncherActivity(this);
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    Log.d(TAG, "onNewIntent");
    AdyenCheckout.handleIntent(intent);
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    Log.d(TAG, "onActivityResult");
    AdyenCheckout.handleActivityResult(requestCode, resultCode, data);
  }
}
