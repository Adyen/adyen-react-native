package com.adyenreactnativesdk.ui

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import androidx.fragment.app.DialogFragment
import com.adyenreactnativesdk.R

interface Cancelable {
    fun canceled()
}

class LoadingDialogFragment(private val cancelable: Cancelable) : DialogFragment() {

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View? {
        isCancelable = false
        return inflater.inflate(R.layout.loading, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        requireDialog().window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))

        val button = view.findViewById<Button>(R.id.loading_button)
        button.setOnClickListener {
            cancelable.canceled()
        }
    }

    companion object {
        fun newInstance(cancelable: Cancelable): LoadingDialogFragment {
            return LoadingDialogFragment(cancelable)
        }
    }
}