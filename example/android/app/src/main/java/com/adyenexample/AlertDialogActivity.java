package com.adyenexample;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Bundle;

public class AlertDialogActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        displayAlert();
    }

    private String title;
    private String message;

    private void displayAlert() {
// Use the Builder class for convenient dialog construction
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        String message = getIntent().getStringExtra("message");
        String title = getIntent().getStringExtra("title");
        builder.setTitle(title)
                .setMessage(message)
                .setPositiveButton("Agree", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        AlertDialogActivity.this.finish();
                        dialog.cancel();
                        
                        Intent myIntent = new Intent(ForcedAlertModule.CLOSE);
                        myIntent.putExtra("agree", true);
                        sendBroadcast(myIntent);

                        finish();
                    }
                })
                .setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int id) {
                        AlertDialogActivity.this.finish();
                        dialog.cancel();

                        Intent myIntent = new Intent(ForcedAlertModule.CLOSE);
                        myIntent.putExtra("agree", false);
                        sendBroadcast(myIntent);

                        finish();
                    }
                });

        // Create the AlertDialog object and return it
        AlertDialog alert = builder.create();
        alert.setCancelable(false);
        alert.show();
    }
}
