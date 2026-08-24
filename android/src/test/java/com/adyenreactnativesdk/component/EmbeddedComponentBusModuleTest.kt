/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component

import com.adyenreactnativesdk.react.ComponentContract
import com.adyenreactnativesdk.util.messaging.MessageBus
import org.junit.After
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify

class EmbeddedComponentBusModuleTest {
  private val messageBus = mock(MessageBus::class.java)
  private val consumer = mock(ComponentContract::class.java)
  private val sut = EmbeddedComponentBusModule(context = null, messageBus)

  @After
  fun tearDown() {
    EmbeddedComponentBusModule.clearConsumers()
  }

  @Test
  fun submitRoutesToRegisteredConsumer() {
    EmbeddedComponentBusModule.register(VIEW_ID, consumer)

    sut.submit(VIEW_ID)

    verify(consumer, times(1)).onSubmit()
  }

  @Test
  fun hideFailureStopsLoadingWithoutUnregisteringConsumer() {
    EmbeddedComponentBusModule.register(VIEW_ID, consumer)

    sut.hide(VIEW_ID, success = false, message = null)

    verify(consumer, times(1)).onStopLoading()
    sut.submit(VIEW_ID)
    verify(consumer, times(1)).onSubmit()
  }

  companion object {
    private const val VIEW_ID = "card-view"
  }
}
