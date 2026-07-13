/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.instant

import com.adyen.checkout.components.core.PaymentMethodTypes
import com.adyenreactnativesdk.component.instant.fragment.IdealFragment
import com.adyenreactnativesdk.component.instant.fragment.InstantFragment
import com.adyenreactnativesdk.component.instant.fragment.PayByBankGlobalFragment
import com.adyenreactnativesdk.component.instant.fragment.PayByBankUSFragment
import com.adyenreactnativesdk.component.instant.fragment.TwintFragment
import org.junit.Assert.assertEquals
import org.junit.Test

class InstantModuleTest {
  @Test
  fun `fragmentForType returns IdealFragment for IDEAL`() {
    assertEquals(IdealFragment, InstantModule.fragmentForType(PaymentMethodTypes.IDEAL))
  }

  @Test
  fun `fragmentForType returns PayByBankGlobalFragment for PAY_BY_BANK`() {
    assertEquals(PayByBankGlobalFragment, InstantModule.fragmentForType(PaymentMethodTypes.PAY_BY_BANK))
  }

  @Test
  fun `fragmentForType returns PayByBankUSFragment for PAY_BY_BANK_US`() {
    assertEquals(PayByBankUSFragment, InstantModule.fragmentForType(PaymentMethodTypes.PAY_BY_BANK_US))
  }

  @Test
  fun `fragmentForType returns TwintFragment for TWINT`() {
    assertEquals(TwintFragment, InstantModule.fragmentForType(PaymentMethodTypes.TWINT))
  }

  @Test
  fun `fragmentForType returns InstantFragment for unrecognised type`() {
    assertEquals(InstantFragment, InstantModule.fragmentForType("unknown_payment_method"))
  }

  @Test
  fun `fragmentForType returns InstantFragment for null type`() {
    assertEquals(InstantFragment, InstantModule.fragmentForType(null))
  }
}
