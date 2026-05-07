package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.StoredPaymentMethod

fun interface RemoveStoredPaymentMessenger {
  fun onRemove(storedPaymentMethod: StoredPaymentMethod)
}
