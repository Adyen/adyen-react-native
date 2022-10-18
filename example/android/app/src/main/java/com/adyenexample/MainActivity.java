package com.adyenexample;

import android.content.Intent;
import android.util.Log;

import com.adyenreactnativesdk.action.ActionHandler;
import com.adyenreactnativesdk.component.googlepay.AdyenGooglePayComponent;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "AdyenExample";
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    Log.d("MainActivity", "onNewIntent");
    ActionHandler.handleIntent(intent);
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    Log.d("MainActivity", "onActivityResult");
    AdyenGooglePayComponent.handleState(requestCode, resultCode, data);
  }
}
