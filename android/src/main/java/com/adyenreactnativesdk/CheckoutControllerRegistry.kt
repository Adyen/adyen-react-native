/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk

import android.content.Intent
import com.adyen.checkout.core.components.CheckoutController
import java.util.Collections
import java.util.WeakHashMap

/**
 * Tracks active [CheckoutController]s so a redirect/deep-link `onNewIntent` can be dispatched to the
 * one awaiting it; entries are held weakly to avoid leaking destroyed views/fragments.
 */
internal object CheckoutControllerRegistry {
  private val controllers: MutableSet<CheckoutController> =
    Collections.synchronizedSet(Collections.newSetFromMap(WeakHashMap()))

  fun register(controller: CheckoutController) {
    controllers.add(controller)
  }

  fun unregister(controller: CheckoutController) {
    controllers.remove(controller)
  }

  fun handleReturn(intent: Intent): Boolean {
    val snapshot = synchronized(controllers) { controllers.toList() }
    if (snapshot.isEmpty()) return false
    snapshot.forEach { it.handleReturn(intent) }
    return true
  }
}
