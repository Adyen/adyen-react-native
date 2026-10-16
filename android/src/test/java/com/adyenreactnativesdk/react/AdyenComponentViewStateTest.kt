/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import androidx.fragment.app.FragmentActivity
import com.adyen.checkout.core.components.CheckoutController
import com.adyenreactnativesdk.component.base.CheckoutState
import com.adyenreactnativesdk.coordinator.CheckoutCoordinator
import com.adyenreactnativesdk.coordinator.CheckoutStateOwner
import com.adyenreactnativesdk.coordinator.RegisteredController
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.facebook.react.uimanager.ThemedReactContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class AdyenComponentViewStateTest {
  private val activity = Robolectric.buildActivity(FragmentActivity::class.java).setup().get()
  private val context = mock<ThemedReactContext>().also { whenever(it.currentActivity).thenReturn(activity) }

  @After
  fun tearDown() {
    CheckoutCoordinator.shared.invalidate()
  }

  @Test
  fun `mount attaches the registry controller without creating one`() {
    val (checkoutId, controllerId, controller) = registeredController()
    val view = DynamicComponentView(activity)

    state(checkoutId, controllerId).updateRegistration(view)

    assertTrue(view.isViewSet)
    assertTrue(CheckoutCoordinator.shared.isControllerBound(controllerId))
    assertEquals(1, CheckoutCoordinator.shared.controllerCount())
    assertEquals(0, controller.disposeCount)
  }

  @Test
  fun `a second simultaneous view of one controller is rejected and rebinding after unmount is allowed`() {
    val (checkoutId, controllerId, controller) = registeredController()
    val firstView = DynamicComponentView(activity)
    val secondView = DynamicComponentView(activity)
    val first = state(checkoutId, controllerId)
    val second = state(checkoutId, controllerId)

    first.updateRegistration(firstView)
    second.updateRegistration(secondView)

    assertTrue(firstView.isViewSet)
    assertFalse(secondView.isViewSet)

    first.dispose(firstView)
    assertFalse("unmount detaches without disposing", CheckoutCoordinator.shared.isControllerBound(controllerId))
    assertEquals(0, controller.disposeCount)
    assertEquals(1, CheckoutCoordinator.shared.controllerCount())

    second.updateRegistration(secondView)
    assertTrue(secondView.isViewSet)
    assertTrue(CheckoutCoordinator.shared.isControllerBound(controllerId))
  }

  @Test
  fun `stale or unknown controller identities render nothing`() {
    val (checkoutId, controllerId) = registeredController()
    val unknownView = DynamicComponentView(activity)
    val staleView = DynamicComponentView(activity)

    state(checkoutId, "unknown-controller").updateRegistration(unknownView)
    CheckoutCoordinator.shared.invalidate()
    state(checkoutId, controllerId).updateRegistration(staleView)

    assertFalse(unknownView.isViewSet)
    assertFalse(staleView.isViewSet)
  }

  @Test
  fun `checkout cleanup disposes the controller once and detaches its mounted view`() {
    val (checkoutId, controllerId, controller) = registeredController()
    val view = DynamicComponentView(activity)
    val state = state(checkoutId, controllerId)
    state.updateRegistration(view)

    CheckoutCoordinator.shared.invalidate()
    state.dispose(view)

    assertFalse(view.isViewSet)
    assertEquals(1, controller.disposeCount)
  }

  private fun state(
    checkoutId: String,
    controllerId: String,
  ): AdyenComponentViewState =
    AdyenComponentViewState(context).apply {
      this.checkoutId = checkoutId
      this.controllerId = controllerId
    }

  private fun registeredController(): Triple<String, String, Controller> {
    val checkoutId = CheckoutCoordinator.shared.setup { StateOwner(CheckoutState(mock())) }
    val controller = Controller()
    val registration = checkNotNull(CheckoutCoordinator.shared.registerController(checkoutId, "card-id") { controller })
    return Triple(checkoutId, registration.controllerId, controller)
  }

  private class Controller : RegisteredController {
    var disposeCount = 0
    override val checkoutController: CheckoutController = mock()
    override val requiresUserInteraction: Boolean = true

    override fun bindOperation(operationId: String) = Unit

    override fun releaseOperation(operationId: String) = Unit

    override fun dispose() {
      disposeCount += 1
    }
  }

  private class StateOwner(
    override val checkoutState: CheckoutState,
  ) : CheckoutStateOwner {
    override fun dispose() = Unit
  }
}
