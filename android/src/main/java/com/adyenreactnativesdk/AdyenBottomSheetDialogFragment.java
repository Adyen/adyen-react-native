/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk;

import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;

import com.adyen.checkout.components.ComponentError;
import com.adyen.checkout.components.ComponentView;
import com.adyen.checkout.components.PaymentComponent;
import com.adyen.checkout.components.PaymentComponentState;
import com.adyen.checkout.components.ViewableComponent;
import com.adyen.checkout.components.model.payments.Amount;
import com.adyen.checkout.components.util.CurrencyUtils;
import com.adyen.checkout.dropin.databinding.FragmentGenericComponentBinding;
import com.adyen.checkout.dropin.ui.ComponentDialogViewModel;
import com.adyen.checkout.dropin.ui.ComponentFragmentState;
import com.adyenreactnativesdk.R;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.bottomsheet.BottomSheetDialogFragment;


public class AdyenBottomSheetDialogFragment extends BottomSheetDialogFragment implements View.OnClickListener {

    private int dialogInitViewState = BottomSheetBehavior.STATE_COLLAPSED;

    private ComponentViewModel viewModel;
    private ComponentView componentView;
    private FragmentGenericComponentBinding binding;
    private ComponentDialogViewModel componentViewModel;
    private PaymentComponent component;

    public AdyenBottomSheetDialogFragment(@NonNull ComponentViewModel viewModel, @NonNull ComponentView view, @NonNull PaymentComponent component) {
        this.viewModel = viewModel;
        this.componentView = view;
        this.component = component;
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        componentViewModel = new ViewModelProvider(getActivity()).get(ComponentDialogViewModel.class);
    }

    @NonNull
    @Override
    public Dialog onCreateDialog(@Nullable Bundle savedInstanceState) {
        Dialog dialog = super.onCreateDialog(savedInstanceState);

        dialog.setOnShowListener(new DialogInterface.OnShowListener() {
            @Override
            public void onShow(DialogInterface dialog) {
                FrameLayout bottomSheet = ((BottomSheetDialog)dialog).findViewById(com.google.android.material.R.id.design_bottom_sheet);

                if (bottomSheet == null) { return; }

                BottomSheetBehavior<FrameLayout> behavior = BottomSheetBehavior.from(bottomSheet);
                if (dialogInitViewState == BottomSheetBehavior.STATE_EXPANDED) {
                    behavior.setSkipCollapsed(true);
                }
                behavior.setState(dialogInitViewState);
            }
        });

        return dialog;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        binding = FragmentGenericComponentBinding.inflate(inflater, container, false);

        componentViewModel.getComponentFragmentState().observe(getViewLifecycleOwner(), new Observer<ComponentFragmentState>() {
            @Override
            public void onChanged(ComponentFragmentState state) {
                setPaymentPendingInitialization(state == ComponentFragmentState.AWAITING_COMPONENT_INITIALIZATION);
                if (state == ComponentFragmentState.INVALID_UI) {
                    highlightValidationErrors();
                }
                PaymentComponentState componentState = component.getState();
                if (state == ComponentFragmentState.PAYMENT_READY && componentState != null) {
                    Log.d("DialogFragment", "Paying: " + state.toString());
                    viewModel.getListener().onSubmit(componentState.getData());
                    componentViewModel.paymentStarted();
                }
            }
        });

        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {

        component.observe(getViewLifecycleOwner(), new Observer() {
            @Override
            public void onChanged(Object o) {
                componentViewModel.componentStateChanged(component.getState(), componentView.isConfirmationRequired());
            }
        });

        component.observeErrors(getViewLifecycleOwner(), new Observer<ComponentError>() {
            @Override
            public void onChanged(ComponentError componentError) {
                viewModel.getListener().onError(componentError.getException());
            }
        });

        binding.header.setText(viewModel.getPaymentMethod().getName());
        binding.componentContainer.addView((View)componentView);
        componentView.attach((ViewableComponent) component, getActivity());

        Amount amount = viewModel.getAmount();
        if (amount != null && amount.isEmpty()) {
            String amountString = CurrencyUtils.formatAmount(amount, viewModel.getShopperLocale());
            String formatted = getResources().getString(R.string.pay_button_with_value, amountString);
            binding.payButton.setText(formatted);
        } else {
            binding.payButton.setText(getResources().getString(R.string.pay_button));
        }

        if (componentView.isConfirmationRequired()) {
            dialogInitViewState = BottomSheetBehavior.STATE_EXPANDED;
            binding.payButton.setOnClickListener(this);
            ((View) componentView).requestFocus();
        } else {
            binding.payButton.setVisibility(View.GONE);
        }
    }

    protected void highlightValidationErrors() {
        componentView.highlightValidationErrors();
    }

    protected void setPaymentPendingInitialization(boolean pending) {
        if (!componentView.isConfirmationRequired()) {
            binding.payButton.setVisibility( pending ? View.INVISIBLE : View.VISIBLE);
        }

        if (pending) {
            binding.progressBar.show();
        } else {
            binding.progressBar.hide();
        }
    }

    @Override
    public void onClick(View v) {
        componentViewModel.payButtonClicked();
    }
}
