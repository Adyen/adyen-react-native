/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

import com.adyen.checkout.core.components.CheckoutTarget
import com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class PaymentMethodCatalogTest {
  @Test
  fun `every regular payment method is stamped with a unique id including duplicate types`() {
    val catalog = PaymentMethodCatalog(paymentMethods())
    val regular = catalog.paymentMethodsJson.getJSONArray("paymentMethods")

    val stampedIds = (0 until regular.length()).map { regular.getJSONObject(it).getString("id") }

    assertEquals(4, stampedIds.size)
    assertTrue(stampedIds.all { it.isNotBlank() })
    assertEquals(stampedIds.size, stampedIds.toSet().size)
    assertEquals(catalog.regularIds, stampedIds)
    assertEquals("givex", regular.getJSONObject(1).getString("brand"))
    assertEquals("svs", regular.getJSONObject(2).getString("brand"))
  }

  @Test
  fun `stored payment methods keep their API id and are left unchanged in the snapshot`() {
    val catalog = PaymentMethodCatalog(paymentMethods())
    val stored = catalog.paymentMethodsJson.getJSONArray("storedPaymentMethods")

    assertEquals(listOf("stored-first", "stored-second"), catalog.storedIds)
    assertEquals(listOf("stored-first", "stored-second"), (0 until stored.length()).map { stored.getJSONObject(it).getString("id") })
    assertEquals(CatalogPaymentMethod.Stored("stored-second"), catalog.paymentMethod("stored-second"))
    assertEquals(CheckoutTarget.StoredPaymentMethod("stored-second"), catalog.exactTarget(CatalogPaymentMethod.Stored("stored-second")))
  }

  @Test
  fun `each id resolves its exact instance and foreign ids resolve nothing`() {
    val catalog = PaymentMethodCatalog(paymentMethods())

    val resolved = catalog.regularIds.map { checkNotNull(catalog.paymentMethod(it)) as CatalogPaymentMethod.Regular }

    assertEquals(listOf(0, 1, 2, 3), resolved.map { it.index })
    assertEquals(listOf("scheme", "giftcard", "giftcard", "paypal"), resolved.map { it.type })
    assertNull(catalog.paymentMethod("foreign-id"))
    assertNull(catalog.paymentMethod(""))
  }

  @Test
  fun `only the instance the pinned SDK builds by type has a creation target`() {
    val catalog = PaymentMethodCatalog(paymentMethods())
    val (card, firstGiftcard, secondGiftcard, paypal) =
      catalog.regularIds.map { checkNotNull(catalog.paymentMethod(it)) }

    assertEquals(CheckoutTarget.PaymentMethod("scheme"), catalog.exactTarget(card))
    assertEquals(CheckoutTarget.PaymentMethod("giftcard"), catalog.exactTarget(firstGiftcard))
    assertNull("a later same-type instance must never be built as the first one", catalog.exactTarget(secondGiftcard))
    assertEquals(CheckoutTarget.PaymentMethod("paypal"), catalog.exactTarget(paypal))
    assertFalse((secondGiftcard as CatalogPaymentMethod.Regular).isFirstOfType)
  }

  @Test
  fun `colliding minted ids are replaced so published ids stay unique`() {
    val catalog = PaymentMethodCatalog(paymentMethods()) { "stored-first" }

    val ids = catalog.regularIds

    assertEquals(4, ids.toSet().size)
    assertFalse(ids.contains("stored-first"))
    assertEquals(CatalogPaymentMethod.Stored("stored-first"), catalog.paymentMethod("stored-first"))
  }

  @Test
  fun `a fresh catalog mints fresh ids`() {
    val first = PaymentMethodCatalog(paymentMethods())
    val second = PaymentMethodCatalog(paymentMethods())

    assertTrue(first.regularIds.intersect(second.regularIds.toSet()).isEmpty())
  }

  @Test
  fun `missing payment methods publish an empty snapshot`() {
    val catalog = PaymentMethodCatalog(null)

    assertTrue(catalog.regularIds.isEmpty())
    assertTrue(catalog.storedIds.isEmpty())
    assertEquals(0, catalog.paymentMethodsJson.optJSONArray("paymentMethods")?.length() ?: 0)
  }

  private fun paymentMethods(): PaymentMethods =
    PaymentMethods.SERIALIZER.deserialize(
      JSONObject(
        """
        {
          "paymentMethods": [
            {"type": "scheme", "name": "Card", "brands": ["visa"]},
            {"type": "giftcard", "name": "Givex", "brand": "givex"},
            {"type": "giftcard", "name": "SVS", "brand": "svs"},
            {"type": "paypal", "name": "PayPal"}
          ],
          "storedPaymentMethods": [
            {"type": "scheme", "name": "VISA", "id": "stored-first", "brand": "visa", "lastFour": "1111", "expiryMonth": "03", "expiryYear": "2030", "supportedShopperInteractions": ["Ecommerce"]},
            {"type": "scheme", "name": "MC", "id": "stored-second", "brand": "mc", "lastFour": "4444", "expiryMonth": "03", "expiryYear": "2030", "supportedShopperInteractions": ["Ecommerce"]}
          ]
        }
        """.trimIndent(),
      ),
    )
}
