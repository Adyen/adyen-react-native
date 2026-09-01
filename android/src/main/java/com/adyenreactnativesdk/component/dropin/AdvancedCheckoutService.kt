/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.dropin

import com.adyen.checkout.card.old.BinLookupData
import com.adyen.checkout.components.core.ActionComponentData
import com.adyen.checkout.components.core.LookupAddress
import com.adyen.checkout.components.core.Order
import com.adyen.checkout.components.core.PaymentComponentData
import com.adyen.checkout.components.core.PaymentComponentState
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.dropin.old.DropInService
import com.adyenreactnativesdk.AdyenPaymentPackage

open class AdvancedCheckoutService : DropInService() {
  override fun onCreate() {
    super.onCreate()
    DropInModule.advancedService = this
  }

  override fun onSubmit(state: PaymentComponentState<*>) {
    // TODO: v6 migration - old DropInService provides PaymentComponentState (old),
    //  but MessageBus expects PaymentComponentData (v6). Serialize/deserialize to bridge types.
    val json = PaymentComponentData.SERIALIZER.serialize(state.data)
    val v6Data =
      com.adyen.checkout.core.components.data.PaymentComponentData.SERIALIZER
        .deserialize(json)
    AdyenPaymentPackage.dropInMessageBus.onSubmit(v6Data)
  }

  override fun onAdditionalDetails(actionComponentData: ActionComponentData) {
    // TODO: v6 migration - bridge old ActionComponentData to v6 via JSON round-trip.
    val json = ActionComponentData.SERIALIZER.serialize(actionComponentData)
    val v6Data =
      com.adyen.checkout.core.action.data.ActionComponentData.SERIALIZER
        .deserialize(json)
    AdyenPaymentPackage.dropInMessageBus.onAdditionalDetails(v6Data)
  }

  override fun onAddressLookupQueryChanged(query: String) {
    AdyenPaymentPackage.dropInMessageBus.onQueryChanged(query)
  }

  override fun onAddressLookupCompletion(lookupAddress: LookupAddress): Boolean =
    AdyenPaymentPackage.dropInMessageBus.onLookupCompletion(lookupAddress)

  override fun onBalanceCheck(paymentComponentState: PaymentComponentState<*>) {
    AdyenPaymentPackage.dropInMessageBus.onBalanceCheck(paymentComponentState)
  }

  override fun onOrderRequest() {
    AdyenPaymentPackage.dropInMessageBus.onOrderRequest()
  }

  override fun onOrderCancel(
    order: Order,
    shouldUpdatePaymentMethods: Boolean,
  ) {
    AdyenPaymentPackage.dropInMessageBus.onOrderCancel(order, shouldUpdatePaymentMethods)
  }

  override fun onBinLookup(data: List<BinLookupData>) {
    // TODO: v6 migration - map old BinLookupData to v6 BinLookupData
  }

  override fun onBinValue(binValue: String) {
    AdyenPaymentPackage.dropInMessageBus.onBinValue(binValue)
  }

  override fun onRemoveStoredPaymentMethod(storedPaymentMethod: StoredPaymentMethod) {
    DropInModule.storedPaymentMethodID = storedPaymentMethod.id
    AdyenPaymentPackage.dropInMessageBus.onRemove(storedPaymentMethod)
  }
}
