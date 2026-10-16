/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.common.CheckoutContext
import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** The exact payment method instance a published id refers to. */
internal sealed interface CatalogPaymentMethod {
  /**
   * A regular payment method at [index] of the checkout's regular list.
   *
   * The pinned SDK creates regular controllers by type and always resolves the first instance of
   * that type. [isFirstOfType] records whether the SDK would build this exact instance; later
   * same-type instances (for example several gift card brands) are never replaced by the first.
   */
  data class Regular(
    val index: Int,
    val type: String,
    val isFirstOfType: Boolean,
  ) : CatalogPaymentMethod

  data class Stored(
    val id: String,
  ) : CatalogPaymentMethod
}

/**
 * Immutable id snapshot of one checkout's payment methods.
 *
 * Regular methods receive a freshly minted id; stored methods keep their API identifier. The
 * stamped JSON is what JavaScript receives, so every id it can send back resolves here.
 */
internal class PaymentMethodCatalog(
  paymentMethods: PaymentMethods?,
  makeId: () -> String = { UUID.randomUUID().toString() },
) {
  val paymentMethodsJson: JSONObject
  val regularIds: List<String>
  val storedIds: List<String>
  private val entries: Map<String, CatalogPaymentMethod>

  init {
    val json = PaymentMethods.SERIALIZER.serialize(paymentMethods ?: PaymentMethods())
    val entries = mutableMapOf<String, CatalogPaymentMethod>()
    val storedIds = mutableListOf<String>()
    paymentMethods?.storedPaymentMethods?.forEach { stored ->
      if (stored.id.isNotEmpty() && entries[stored.id] == null) {
        entries[stored.id] = CatalogPaymentMethod.Stored(stored.id)
        storedIds += stored.id
      }
    }

    val regularJson = json.optJSONArray(REGULAR_KEY) ?: JSONArray()
    val regularIds = mutableListOf<String>()
    val firstIndexByType = mutableMapOf<String, Int>()
    paymentMethods?.paymentMethods?.forEachIndexed { index, paymentMethod ->
      val entry = regularJson.optJSONObject(index) ?: return@forEachIndexed
      var id = makeId()
      while (id.isEmpty() || entries[id] != null) {
        id = UUID.randomUUID().toString()
      }
      val firstIndex = firstIndexByType.getOrPut(paymentMethod.type) { index }
      entries[id] = CatalogPaymentMethod.Regular(index, paymentMethod.type, isFirstOfType = firstIndex == index)
      entry.put(ID, id)
      regularIds += id
    }

    paymentMethodsJson = json
    this.regularIds = regularIds
    this.storedIds = storedIds
    this.entries = entries
  }

  fun paymentMethod(id: String): CatalogPaymentMethod? = entries[id]

  /**
   * The SDK target that builds exactly [paymentMethod], or null when the pinned SDK would
   * substitute a different instance.
   */
  fun exactTarget(paymentMethod: CatalogPaymentMethod): CheckoutTarget? =
    when (paymentMethod) {
      is CatalogPaymentMethod.Regular -> {
        if (paymentMethod.isFirstOfType) CheckoutTarget.PaymentMethod(paymentMethod.type) else null
      }

      is CatalogPaymentMethod.Stored -> {
        CheckoutTarget.StoredPaymentMethod(paymentMethod.id)
      }
    }

  companion object {
    private const val REGULAR_KEY = "paymentMethods"
    private const val ID = "id"

    fun from(context: CheckoutContext): PaymentMethodCatalog = PaymentMethodCatalog(paymentMethodsOf(context))

    @Suppress("UNNECESSARY_SAFE_CALL")
    private fun paymentMethodsOf(context: CheckoutContext): PaymentMethods? =
      when (context) {
        // Safe calls tolerate partially initialised contexts (test doubles) without throwing.
        is CheckoutContext.Sessions -> context.checkoutSession?.sessionSetupResponse?.paymentMethods

        is CheckoutContext.Advanced -> context.paymentMethods

        else -> null
      }
  }
}
