/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component

import com.adyen.checkout.card.BinLookupData
import com.adyen.checkout.components.core.AddressLookupCallback
import com.adyen.checkout.components.core.StoredPaymentMethod
import com.adyen.checkout.core.exception.CheckoutException
import com.adyen.checkout.dropin.BaseDropInServiceContract
import com.adyen.checkout.dropin.DropInServiceContract
import com.adyen.checkout.sessions.core.SessionPaymentResult
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import java.lang.ref.WeakReference

class CheckoutProxy private constructor() {
  private var _componentListener = WeakReference<ComponentEventListener>(null)

  var sessionService: BaseDropInServiceContract? = null

  var advancedService: BaseDropInServiceContract? = null

  var addressListener: AddressLookupCallback? = null

  var dropInListener: DropInStoredPaymentEventListener? = null

  var componentListener: ComponentEventListener?
    get() = _componentListener.get()
    set(value) {
      _componentListener = WeakReference(value)
    }

  /** Base events coming from Components */
  interface ComponentEventListener : DropInServiceContract {
    fun onException(exception: CheckoutException)

    fun onFinished(result: SessionPaymentResult)
  }

  /** Events coming from Card Component */
  interface CardComponentEventListener {
    fun onBinValue(binValue: String)

    fun onBinLookup(data: List<BinLookupData>)
  }

  interface DropInStoredPaymentEventListener {
    fun onRemove(storedPaymentMethod: StoredPaymentMethod)
  }

  companion object {
    var shared = CheckoutProxy()
  }
}
