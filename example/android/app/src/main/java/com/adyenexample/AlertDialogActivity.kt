package com.adyenexample

import android.app.Activity
import android.app.AlertDialog
import android.os.Bundle
import android.content.DialogInterface
import android.content.Intent
import com.adyenexample.ForcedAlertModule

class AlertDialogActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        displayAlert()
    }

    private fun displayAlert() {
        val builder = AlertDialog.Builder(this)
        val message = intent.getStringExtra("message")
        val title = intent.getStringExtra("title")
        builder
            .setTitle(title)
            .setMessage(message)
            .setPositiveButton("Agree") { dialog, id ->
                finish()
                dialog.cancel()
                val myIntent = Intent(ForcedAlertModule.CLOSE)
                myIntent.putExtra("agree", true)
                sendBroadcast(myIntent)
                finish()
            }
            .setNegativeButton("Cancel") { dialog, id ->
                finish()
                dialog.cancel()
                val myIntent = Intent(ForcedAlertModule.CLOSE)
                myIntent.putExtra("agree", false)
                sendBroadcast(myIntent)
                finish()
            }

        // Create the AlertDialog object and return it
        val alert = builder.create()
        alert.setCancelable(false)
        alert.show()
    }
}