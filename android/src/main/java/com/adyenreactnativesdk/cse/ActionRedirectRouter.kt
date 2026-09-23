/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import android.content.Intent
import android.net.Uri

/**
 * Routes an Android return only to the currently active standalone Action operation.
 *
 * The Android public return entry point has no React module instance. This small Action-owned
 * bridge is therefore the only process-level reference required to reach the module-owned
 * operation. It never delegates to, reads from, or changes CheckoutCoordinator state.
 */
internal object ActionRedirectRouter {
  private var route: Route? = null

  fun register(
    operationId: Long,
    returnUri: Uri,
    handler: (Intent) -> Unit,
  ) {
    route = Route(operationId, returnUri, handler)
  }

  fun unregister(operationId: Long) {
    if (route?.operationId == operationId) {
      route = null
    }
  }

  fun handleReturn(intent: Intent): Boolean {
    val currentRoute = route ?: return false
    if (!currentRoute.matches(intent.data)) return false
    currentRoute.handler(intent)
    return true
  }

  private class Route(
    val operationId: Long,
    private val returnUri: Uri,
    val handler: (Intent) -> Unit,
  ) {
    fun matches(uri: Uri?): Boolean =
      uri != null &&
        uri.scheme == returnUri.scheme &&
        uri.authority == returnUri.authority &&
        uri.port == returnUri.port &&
        uri.path == returnUri.path
  }
}
