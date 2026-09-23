/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import android.content.Intent
import android.net.Uri
import java.util.concurrent.atomic.AtomicLong

/**
 * Routes an Android return only to the currently active standalone Action operation.
 *
 * The Android public return entry point has no React module instance. This small Action-owned
 * bridge is therefore the only process-level reference required to reach the module-owned
 * operation. Owner tokens are generated process-wide rather than by a module instance because
 * this route and CheckoutFragment's configuration map are process-global.
 */
internal object ActionRedirectRouter {
  private var route: Route? = null

  fun register(
    ownerToken: String,
    returnUri: Uri,
    handler: (Intent) -> Unit,
  ): Boolean {
    if (route != null) return false
    route = Route(ownerToken, returnUri, handler)
    return true
  }

  fun unregister(ownerToken: String) {
    if (route?.ownerToken == ownerToken) {
      route = null
    }
  }

  fun handleReturn(intent: Intent): Boolean {
    val currentRoute = route ?: return false
    if (!currentRoute.matches(intent.data) || currentRoute.delivered) return false
    // Keep the owner registered until its UI cleanup completes. This prevents another React
    // runtime from acquiring the global route while the original fragment is still dismissing.
    currentRoute.delivered = true
    currentRoute.handler(intent)
    return true
  }

  private class Route(
    val ownerToken: String,
    private val returnUri: Uri,
    val handler: (Intent) -> Unit,
  ) {
    var delivered: Boolean = false

    fun matches(uri: Uri?): Boolean =
      uri != null &&
        uri.scheme == returnUri.scheme &&
        uri.authority == returnUri.authority &&
        uri.port == returnUri.port &&
        uri.path == returnUri.path &&
        uri.getQueryParameter(OPERATION_PARAMETER) == ownerToken
  }

  const val OPERATION_PARAMETER = "adyenActionOperation"
}

/**
 * Native-only ownership identity for an Action operation. A React runtime can be torn down and
 * recreated in the same process, so module-local counters cannot identify process-global state.
 */
internal object ActionOperationToken {
  private val nextValue = AtomicLong()

  fun create(): String = "action-${nextValue.incrementAndGet()}"
}
