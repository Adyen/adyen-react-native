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
 * Tracks the active v6 [CheckoutController] instances so a redirect/deep-link return delivered to the
 * host activity's `onNewIntent` can be dispatched to the controller that started the redirect.
 *
 * In v6 [CheckoutController.handleReturn] replaces the v5 component-holder `handleIntent`. Only the
 * controller with a pending redirect action reacts to the intent; the others ignore it, so
 * dispatching to every registered controller is safe. Entries are held weakly so a controller whose
 * owning view or fragment was destroyed without an explicit [unregister] does not leak.
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
