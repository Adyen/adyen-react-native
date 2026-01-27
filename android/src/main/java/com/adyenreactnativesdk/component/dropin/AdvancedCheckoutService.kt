/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.dropin.DropInService
import com.adyen.checkout.redirect.RedirectComponent
import com.adyenreactnativesdk.AdyenPaymentPackage

open class AdvancedCheckoutService : DropInService() {
  override fun onCreate() {
    super.onCreate()
    DropInModule.advancedService = this
  }

  override fun onSubmit(state: PaymentComponentState<*>) {
    val returnUrl = RedirectComponent.getReturnUrl(applicationContext)
    AdyenPaymentPackage.messageBus.onSubmit(state, returnUrl)
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    AdyenPaymentPackage.messageBus.onAdditionalDetails(actionComponentData)
  }

  override fun onAddressLookupQueryChanged(query: String) {
    AdyenPaymentPackage.messageBus.onQueryChanged(query)
  }

  override fun onAddressLookupCompletion(lookupAddress: LookupAddress): Boolean =
    AdyenPaymentPackage.messageBus.onLookupCompletion(lookupAddress)

  override fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>) {
    AdyenPaymentPackage.messageBus.onBalanceCheck(paymentComponentState)
  }

  override fun onOrderRequest() {
    AdyenPaymentPackage.messageBus.onOrderRequest()
  }

  override fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  ) {
    AdyenPaymentPackage.messageBus.onOrderCancel(order, shouldUpdatePaymentMethods)
  }

  override fun onBinLookup(data: List<BinLookupData>) {
    AdyenPaymentPackage.messageBus.onBinLookup(data)
  }

  override fun onBinValue(binValue: String) {
    AdyenPaymentPackage.messageBus.onBinValue(binValue)
  }

  override fun onRemoveStoredPaymentMethod(storedPaymentMethod: StoredPaymentMethod) {
    AdyenPaymentPackage.messageBus.onRemove(storedPaymentMethod)
  }
}
