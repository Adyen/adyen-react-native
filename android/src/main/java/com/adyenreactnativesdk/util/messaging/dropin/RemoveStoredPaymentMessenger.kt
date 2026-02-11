package com.adyenreactnativesdk.util.messaging.dropin

import com.adyen.checkout.components.core.StoredPaymentMethod

interface RemoveStoredPaymentMessenger {
  fun onRemove(storedPaymentMethod: StoredPaymentMethod)
}
