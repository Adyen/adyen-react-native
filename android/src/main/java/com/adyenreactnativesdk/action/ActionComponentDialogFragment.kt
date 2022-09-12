/*
 * Copyright (c) 2022 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.action

import android.content.DialogInterface
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.lifecycle.Observer
import com.adyen.checkout.components.*
import com.adyen.checkout.components.base.OutputData
import com.adyen.checkout.components.model.payments.response.Action
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.core.exception.ComponentException
import com.adyen.checkout.core.log.LogUtil
import com.adyen.checkout.core.log.Logger
import com.adyen.checkout.dropin.databinding.FragmentActionComponentBinding
import com.adyenreactnativesdk.ActionHandler
import com.adyenreactnativesdk.ActionHandlerConfiguration
import com.adyenreactnativesdk.ActionHandlingInterface
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

class ActionComponentDialogFragment(
    private val configuration: ActionHandlerConfiguration,
    private val callback: ActionHandlingInterface
) : BottomSheetDialogFragment(), Observer<ActionComponentData> {

    companion object {
        private val TAG = LogUtil.getTag()
        const val ACTION = "ACTION"
    }

    private var isCanceled = false
    private lateinit var binding: FragmentActionComponentBinding
    private lateinit var action: Action
    private lateinit var actionType: String
    private lateinit var componentView: ComponentView<in OutputData, ViewableComponent<*, *, ActionComponentData>>
    private lateinit var actionComponent: ViewableComponent<*, *, ActionComponentData>
    private var isHandled = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Logger.d(TAG, "onCreate")
        action =
            arguments?.getParcelable(ACTION) ?: throw IllegalArgumentException("Action not found")
        actionType = action.type ?: throw IllegalArgumentException("Action type not found")
    }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentActionComponentBinding.inflate(inflater)
        isCanceled = false
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        Logger.d(TAG, "onViewCreated")
        binding.header.visibility = View.GONE

        try {
            @Suppress("UNCHECKED_CAST")
            componentView = ActionHandler.getViewFor(
                requireContext(),
                actionType
            ) as ComponentView<in OutputData, ViewableComponent<*, *, ActionComponentData>>
            actionComponent = getComponent(action)
            attachComponent(actionComponent, componentView)

            if (shouldFinishWithAction()) {
                with(binding.buttonFinish) {
//                    isVisible = true
                    setOnClickListener { callback.onFinish() }
                }
            }

            if (!isHandled) {
                (actionComponent as ActionComponent<*>).handleAction(requireActivity(), action)
                isHandled = true
            } else {
                Logger.d(TAG, "action already handled")
            }
        } catch (e: CheckoutException) {
            handleError(ComponentError(e))
        }
    }

    override fun onDismiss(dialog: DialogInterface) {
        super.onDismiss(dialog)
        if (isCanceled) {
            callback.onError(CheckoutException("Cancelled"))
        }
    }

    override fun onCancel(dialog: DialogInterface) {
        super.onCancel(dialog)
        isCanceled = true
        Logger.d(TAG, "onCancel")
        callback.onClose()
    }

    override fun onChanged(actionComponentData: ActionComponentData?) {
        Logger.d(TAG, "onChanged")
        if (actionComponentData != null) {
            callback.provide(actionComponentData)
        }
    }

    fun setToHandleWhenStarting() {
        Logger.d(TAG, "setToHandleWhenStarting")
        isHandled = false
    }

    /**
     * Return the possible viewable action components
     */
    @SuppressWarnings("ThrowsCount")
    private fun getComponent(action: Action): ViewableComponent<*, *, ActionComponentData> {
        val provider = ActionHandler.getActionProviderFor(action)
            ?: throw ComponentException("Unexpected Action component type - $actionType")
        if (!provider.requiresView(action)) {
            throw ComponentException("Action is not viewable - action: ${action.type} - paymentMethod: ${action.paymentMethodType}")
        }
        val component =
            ActionHandler.getActionComponentFor(requireActivity(), provider, configuration)
        if (!component.canHandleAction(action)) {
            throw ComponentException("Unexpected Action component type - action: ${action.type} - paymentMethod: ${action.paymentMethodType}")
        }

        @Suppress("UNCHECKED_CAST")
        return component as ViewableComponent<*, *, ActionComponentData>
    }

    private fun attachComponent(
        component: ViewableComponent<*, *, ActionComponentData>,
        componentView: ComponentView<in OutputData, ViewableComponent<*, *, ActionComponentData>>
    ) {
        component.observe(viewLifecycleOwner, this)
        component.observeErrors(viewLifecycleOwner, createErrorHandlerObserver())
        binding.componentContainer.addView(componentView as View)
        @Suppress("UNCHECKED_CAST")
        componentView.attach(component, viewLifecycleOwner)
    }

    private fun createErrorHandlerObserver(): Observer<ComponentError> {
        return Observer {
            if (it != null) {
                handleError(it)
            }
        }
    }

    private fun handleError(componentError: ComponentError) {
        Logger.e(TAG, componentError.errorMessage)
        callback.onError(componentError.exception)
    }

    private fun shouldFinishWithAction(): Boolean {
        return ActionHandler.getActionProviderFor(action)?.providesDetails() == false
    }

}
