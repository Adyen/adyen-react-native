package com.adyenreactnativesdk.ui

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.View.INVISIBLE
import android.view.View.VISIBLE
import android.view.ViewGroup
import android.widget.Button
import androidx.fragment.app.DialogFragment
import com.adyenreactnativesdk.R

interface Cancelable {
    fun canceled()
}

class PendingPaymentDialogFragment() : DialogFragment() {

    var cancelable: Cancelable? = null

    override fun onDestroy() {
        super.onDestroy()
        cancelable = null
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        isCancelable = false
        return inflater.inflate(R.layout.loading, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requireDialog().window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val button = view.findViewById<Button>(R.id.loading_button)
        button.visibility = if (cancelable == null) INVISIBLE else  VISIBLE
        button.setOnClickListener {
            cancelable?.canceled()
        }
    }

    companion object {
        fun newInstance(): PendingPaymentDialogFragment {
            return PendingPaymentDialogFragment()
        }
    }
}