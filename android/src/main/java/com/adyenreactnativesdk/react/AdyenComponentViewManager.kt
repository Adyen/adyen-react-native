/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.react

import com.adyenreactnativesdk.react.base.DynamicComponentView
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.AdyenCheckoutComponentViewManagerDelegate
import com.facebook.react.viewmanagers.AdyenCheckoutComponentViewManagerInterface

/**
 * Generic Fabric [SimpleViewManager] for the embedded `<AdyenComponent>` view.
 */
@ReactModule(name = AdyenComponentViewManager.NAME)
class AdyenComponentViewManager :
  SimpleViewManager<DynamicComponentView>(),
  AdyenCheckoutComponentViewManagerInterface<DynamicComponentView> {
  private val delegate: ViewManagerDelegate<DynamicComponentView> = AdyenCheckoutComponentViewManagerDelegate(this)
  private val viewStates = mutableMapOf<DynamicComponentView, AdyenComponentViewState>()

  override fun getDelegate(): ViewManagerDelegate<DynamicComponentView> = delegate

  override fun getName(): String = NAME

  public override fun createViewInstance(context: ThemedReactContext): DynamicComponentView {
    val view = DynamicComponentView(context)
    val state = AdyenComponentViewState(context)
    view.layoutListener = state
    view.detachListener = { state.dispose(view) }
    viewStates[view] = state
    return view
  }

  override fun onDropViewInstance(view: DynamicComponentView) {
    super.onDropViewInstance(view)
    viewStates.remove(view)?.dispose(view)
  }

  override fun onAfterUpdateTransaction(view: DynamicComponentView) {
    super.onAfterUpdateTransaction(view)
    val state = viewStates[view] ?: return
    state.updateRegistration(view)
  }

  override fun setCheckoutId(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    state.checkoutId = value
  }

  override fun setPresenterId(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    state.presenterId = value
  }

  override fun setTargetKind(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    state.targetKind = value
  }

  override fun setTargetValue(
    view: DynamicComponentView?,
    value: String?,
  ) {
    val state = view?.let { viewStates[it] } ?: return
    state.targetValue = value
  }

  companion object {
    /** Must match the Codegen component name in NativeAdyenCheckoutComponentView.ts exactly. */
    const val NAME = "AdyenCheckoutComponentView"
  }
}
