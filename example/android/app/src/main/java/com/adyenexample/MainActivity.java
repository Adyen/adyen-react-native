package com.adyenexample;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  private FirstReceiver firstReceiver;

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
    super.onCreate(savedInstanceState);
    IntentFilter filter = new IntentFilter(ForcedAlertModule.CLOSE);
    firstReceiver = new FirstReceiver();
    registerReceiver(firstReceiver, filter);
  }


  class FirstReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
      if (intent.getAction().equals(ForcedAlertModule.CLOSE)) {
        if (intent.getBooleanExtra("agree", false)) {
          ForcedAlertModule.onAgree.invoke();
        } else {
          ForcedAlertModule.onCancel.invoke();
        }
      }
    }
  }
}
