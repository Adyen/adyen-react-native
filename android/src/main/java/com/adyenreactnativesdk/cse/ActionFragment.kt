package com.adyenreactnativesdk.cse

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.os.BundleCompat
import androidx.fragment.app.FragmentManager
import com.adyen.checkout.action.core.GenericActionComponent
import com.adyen.checkout.components.core.ActionComponentCallback
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.components.core.action.Action
import com.adyen.checkout.ui.core.AdyenComponentView
import com.adyenreactnativesdk.AdyenCheckout
import com.adyenreactnativesdk.R
import com.google.android.material.bottomsheet.BottomSheetDialogFragment

/**
 * Kept to a no-argument constructor on purpose: [FragmentManager] recreates fragments via
 * reflection on config changes and process restoration, and only ever calls the no-arg
 * constructor before restoring [getArguments]. [configuration] and [action] are Parcelable and
 * travel through [arguments]. [callback] is a live RN module reference and can't be serialized,
 * so it's re-sourced from [ActionModule.currentCallback] instead.
 */
class ActionFragment : BottomSheetDialogFragment() {
  private var actionHandled: Boolean = false
  var component: GenericActionComponent? = null

  private val configuration: CheckoutConfiguration
    get() =
      BundleCompat.getParcelable(requireArguments(), KEY_CONFIGURATION, CheckoutConfiguration::class.java)
        ?: throw IllegalStateException("Missing $KEY_CONFIGURATION argument")

  private val action: Action
    get() =
      BundleCompat.getParcelable(requireArguments(), KEY_ACTION, Action::class.java)
        ?: throw IllegalStateException("Missing $KEY_ACTION argument")

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    actionHandled = savedInstanceState?.getBoolean(KEY_ACTION_HANDLED) ?: false
  }

  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    outState.putBoolean(KEY_ACTION_HANDLED, actionHandled)
  }

  override fun onCreateView(
    inflater: LayoutInflater,
    container: ViewGroup?,
    savedInstanceState: Bundle?,
  ): View = inflater.inflate(R.layout.fragment_instant, container)

  override fun onStart() {
    super.onStart()

    setupComponent()
  }

  private fun setupComponent() {
    val callback = ActionModule.currentCallback
    if (callback == null) {
      dismiss()
      return
    }

    val component =
      GenericActionComponent.PROVIDER.get(
        this,
        configuration,
        callback,
        TAG,
      )

    this.component = component
    this.isCancelable = false
    AdyenCheckout.setComponent(component)
    view
      ?.findViewById<AdyenComponentView>(R.id.component_view)
      ?.attach(component, this)
      ?: run { Log.e(TAG, FRAGMENT_ERROR) }

    if (!actionHandled) {
      handle(parentFragmentManager, action, TAG)
    }
  }

  private fun handle(
    fragmentManager: FragmentManager,
    action: Action,
    tag: String,
  ) {
    val fragment = fragmentManager.findFragmentByTag(tag) as ActionFragment
    fragment.component?.handleAction(action, requireActivity())
    actionHandled = true
  }

  companion object {
    internal const val TAG = "ActionFragment"
    const val FRAGMENT_ERROR =
      "Not able to find AdyenComponentView in `component_view` fragment"

    private const val KEY_CONFIGURATION = "KEY_CONFIGURATION"
    private const val KEY_ACTION = "KEY_ACTION"
    private const val KEY_ACTION_HANDLED = "KEY_ACTION_HANDLED"

    fun show(
      fragmentManager: FragmentManager,
      configuration: CheckoutConfiguration,
      action: Action,
    ) {
      ActionFragment()
        .apply {
          arguments =
            Bundle().apply {
              putParcelable(KEY_CONFIGURATION, configuration)
              putParcelable(KEY_ACTION, action)
            }
        }.show(fragmentManager, TAG)
    }

    fun hide(fragmentManager: FragmentManager) {
      val fragment = fragmentManager.findFragmentByTag(TAG) as? BottomSheetDialogFragment
      fragment?.dismiss()
    }
  }
}
