/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import android.content.res.Configuration
import android.os.Bundle
import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.components.core.ActionComponentCallback
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.action.ActionTypes
import com.adyen.checkout.components.core.action.RedirectAction
import com.adyen.checkout.core.Environment
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class ActionFragmentTest {
  private val configuration = CheckoutConfiguration(Environment.TEST, "test_client_key")
  private val action = RedirectAction(type = ActionTypes.REDIRECT, url = "https://example.com")

  private fun buildArguments(): Bundle =
    Bundle().apply {
      putParcelable("KEY_CONFIGURATION", configuration)
      putParcelable("KEY_ACTION", action)
    }

  @After
  fun tearDown() {
    ActionModule.currentCallback = null
  }

  @Test
  fun `configuration and action round trip through arguments`() {
    val fragment = ActionFragment().apply { arguments = buildArguments() }

    assertEquals(configuration.environment, fragment.configuration.environment)
    assertEquals(configuration.clientKey, fragment.configuration.clientKey)
    assertEquals(action, fragment.action)
  }

  @Test
  fun `configuration and action are cached after first access`() {
    val fragment = ActionFragment().apply { arguments = buildArguments() }

    assertSame(fragment.configuration, fragment.configuration)
    assertSame(fragment.action, fragment.action)
  }

  @Test
  fun `onDestroy clears currentCallback when not changing configurations`() {
    val callback = mock<ActionComponentCallback>()
    ActionModule.currentCallback = callback
    val controller = Robolectric.buildActivity(FragmentActivity::class.java).create()
    val fragment = ActionFragment().apply { arguments = buildArguments() }
    controller
      .get()
      .supportFragmentManager
      .beginTransaction()
      .add(fragment, ActionFragment.TAG)
      .commitNow()

    controller.destroy()

    assertNull(ActionModule.currentCallback)
  }

  @Test
  fun `onDestroy keeps currentCallback across configuration changes`() {
    val callback = mock<ActionComponentCallback>()
    ActionModule.currentCallback = callback
    val controller = Robolectric.buildActivity(FragmentActivity::class.java).create()
    val fragment = ActionFragment().apply { arguments = buildArguments() }
    controller
      .get()
      .supportFragmentManager
      .beginTransaction()
      .add(fragment, ActionFragment.TAG)
      .commitNow()

    controller.configurationChange(Configuration(controller.get().resources.configuration))

    assertSame(callback, ActionModule.currentCallback)
  }
}
