/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react.card

import android.os.Looper
import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.card.CardComponent
import com.adyenreactnativesdk.util.messaging.MessageBus
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class CardComponentManagerTest {
  private val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
  private val component = mock<CardComponent>()
  private val sut =
    CardComponentManager(activity, mock<MessageBus>()).apply {
      component = this@CardComponentManagerTest.component
    }

  @Test
  fun `submit invokes the card component on the main thread`() {
    var invocationThread: Thread? = null
    doAnswer {
      invocationThread = Thread.currentThread()
    }.whenever(component).submit()

    runFromBackgroundThread(sut::submit)

    assertSame(Looper.getMainLooper().thread, invocationThread)
  }

  @Test
  fun `stop loading invokes the card component on the main thread`() {
    var invocationThread: Thread? = null
    doAnswer {
      invocationThread = Thread.currentThread()
    }.whenever(component).setInteractionBlocked(false)

    runFromBackgroundThread(sut::stopLoading)

    assertSame(Looper.getMainLooper().thread, invocationThread)
  }

  private fun runFromBackgroundThread(action: () -> Unit) {
    Thread(action).apply {
      start()
      join()
    }
    shadowOf(Looper.getMainLooper()).idle()
  }
}
