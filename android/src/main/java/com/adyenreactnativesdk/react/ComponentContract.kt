package com.adyenreactnativesdk.react

import com.adyen.checkout.core.action.data.Action

/**
 * Contract implemented by an embedded component's per-view state so the [com.adyenreactnativesdk.component.ComponentModule]
 * can forward JS commands to the correct [com.adyen.checkout.core.components.CheckoutController].
 */
interface ComponentContract {
  /** Resumes the in-flight submission with an action returned by the merchant's `/payments` call. */
  fun onAction(action: Action)

  /**
   * Resolves the in-flight operation with a result reported by JS via `completion` or `retry`.
   *
   * Returns `true` when the operation was a failed submission carrying a shopper-facing message,
   * which loops back into `onSubmit` as `SubmitResult.Retry` and keeps the view registered. Returns
   * `false` for any terminal outcome (completed submission, terminal additional-details result, or
   * no in-flight operation), signalling that the view can be unregistered.
   */
  fun onFinalResult(
    success: Boolean,
    message: String?,
  ): Boolean
}
