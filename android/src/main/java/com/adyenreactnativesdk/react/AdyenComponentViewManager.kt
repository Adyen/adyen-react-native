/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import android.util.Log
import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.adyenreactnativesdk.util.messaging.MessageBusEmitter
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.AdyenComponentViewManagerDelegate
import com.facebook.react.viewmanagers.AdyenComponentViewManagerInterface

/**
 * Generic Fabric [SimpleViewManager] for the embedded `<AdyenComponent>` view. Renders the payment
 * component for any payment method type through a shared [AdyenComponentViewState]. Replaces the
 * former per-method card and platform-pay view managers.
 */
@ReactModule(name = AdyenComponentViewManager.NAME)
class AdyenComponentViewManager(
  private val messageBusEmitter: MessageBusEmitter,
) : SimpleViewManager<DynamicComponentView>(),
  AdyenComponentViewManagerInterface<DynamicComponentView> {
  private val delegate: ViewManagerDelegate<DynamicComponentView> = AdyenComponentViewManagerDelegate(this)
  private val viewStates = mutableMapOf<DynamicComponentView, AdyenComponentViewState>()

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    val view = DynamicComponentView(context)
    val state = AdyenComponentViewState(context, messageBusEmitter)
    view.layoutListener = state
    viewStates[view] = state
    return view
  }

  override fun onDropViewInstance(view: DynamicComponentView) {
    super.onDropViewInstance(view)
    viewStates.remove(view)?.dispose(view)
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)
    if (view.isViewSet) return

    val state = viewStates[view] ?: return
    state.renderView(view)
  }

  override fun setType(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    if (value == null) {
      Log.e(NAME, "type value is null")
      return
    }
    state.type = value
  }

  override fun setConfiguration(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    state.configuration = value
  }

  companion object {
    const val NAME = "AdyenComponentView"
  }
}
