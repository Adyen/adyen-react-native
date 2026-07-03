/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base.viewmodel

import com.adyenreactnativesdk.AdyenPaymentPackage
import com.adyenreactnativesdk.component.base.ModuleException
import com.adyenreactnativesdk.util.messaging.MessageBus
import com.adyenreactnativesdk.util.messaging.MockEmitter
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AdvancedComponentViewModelTest {
  private lateinit var mockEmitter: MockEmitter

  @Before
  fun setUp() {
    mockEmitter = MockEmitter()
    injectMessageBus(MessageBus(mockEmitter))
  }

  @After
  fun tearDown() {
    injectMessageBus(null)
  }

  @Test
  fun `cancel sends Canceled exception via messageBus`() {
    // GIVEN
    val sut = AdvancedComponentViewModel<Nothing>()

    // WHEN
    sut.cancel()

    // THEN
    assertEquals(1, mockEmitter.errors.size)
    assertTrue(mockEmitter.errors[0].error is ModuleException.Canceled)
  }

  /**
   * Injects [bus] into [AdyenPaymentPackage]'s companion-object backing field via reflection.
   * The `@Volatile private var _messageBus` compiles to a static field on the outer JVM class.
   */
  private fun injectMessageBus(bus: MessageBus?) {
    val field = AdyenPaymentPackage::class.java.getDeclaredField("_messageBus")
    field.isAccessible = true
    field.set(null, bus)
  }
}
