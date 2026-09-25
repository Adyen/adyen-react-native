/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

/**
 * Owns the asynchronous half of one Fabric registration. This is an internal native test seam,
 * not a bridge control. A completed factory result can attach only while its exact registration
 * is still current, and all failed or stale results dispose their registration.
 */
internal class FabricRegistrationCreation<Controller : Any> {
  suspend fun createAndAttach(
    create: suspend () -> Controller?,
    isCurrent: () -> Boolean,
    attach: (Controller) -> Unit,
    dispose: () -> Unit,
    onFailure: (Exception) -> Unit,
  ) {
    val controller =
      try {
        create()
      } catch (exception: Exception) {
        onFailure(exception)
        dispose()
        return
      }
    if (controller == null || !isCurrent()) {
      dispose()
      return
    }
    attach(controller)
  }
}
