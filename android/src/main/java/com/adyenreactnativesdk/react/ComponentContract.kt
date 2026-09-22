package com.adyenreactnativesdk.react

import com.adyen.checkout.core.action.data.Action

/** Contract for an embedded component's per-view state to receive JS commands from [com.adyenreactnativesdk.component.ComponentModule]. */
interface ComponentContract {
  /** Resumes the in-flight submission with an action returned by the merchant's `/payments` call. */
  fun onAction(action: Action)

  /**
   * Resolves the in-flight operation with a result from JS (`completion`/`retry`).
   *
   * Returns `true` for a retriable failure (loops back as `SubmitResult.Retry`, view stays
   * registered); `false` for any terminal outcome, signalling the view can be unregistered.
   */
  fun onFinalResult(
    success: Boolean,
    message: String?,
  ): Boolean
}
