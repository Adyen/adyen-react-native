/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import com.adyen.checkout.card.InstallmentConfiguration
import com.adyen.checkout.card.InstallmentOptions
import com.adyen.checkout.core.common.CardBrand
import com.facebook.react.bridge.ReadableMap

internal class InstallmentConfigurationParser(
  private val config: ReadableMap,
  private val showInstallmentAmount: Boolean = false,
) {
  companion object {
    private const val INSTALLMENT_VALUES_KEY = "values"
    private const val INSTALLMENT_PLANS_KEY = "plans"
    private const val INSTALLMENT_DEFAULT_KEY = "card"
    private const val INSTALLMENT_PLAN_REVOLVING = "revolving"
  }

  val installmentConfiguration: InstallmentConfiguration?
    get() {
      var defaultOptions: InstallmentOptions? = null
      val cardBasedOptions = mutableMapOf<CardBrand, InstallmentOptions>()

      val iterator = config.keySetIterator()
      while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        val optionMap = config.getMap(key) ?: continue

        val values =
          optionMap
            .getArray(INSTALLMENT_VALUES_KEY)
            ?.toArrayList()
            ?.mapNotNull {
              (it as? Number)?.toInt()
            }?.filter { it > 1 }
            ?.takeIf { it.isNotEmpty() }
            ?: continue
        val plans =
          if (optionMap.hasKey(INSTALLMENT_PLANS_KEY)) {
            optionMap.getArray(INSTALLMENT_PLANS_KEY)?.toArrayList()?.map { it.toString() } ?: emptyList()
          } else {
            emptyList()
          }
        val installmentOptions = buildInstallmentOptions(values, plans)

        if (key.equals(INSTALLMENT_DEFAULT_KEY, ignoreCase = true)) {
          // Default options for all cards
          defaultOptions = installmentOptions
        } else {
          // Card-specific options
          cardBasedOptions[CardBrand(key)] = installmentOptions
        }
      }

      // Return configuration only if we have at least one option
      return if (defaultOptions != null || cardBasedOptions.isNotEmpty()) {
        InstallmentConfiguration(
          defaultOptions = defaultOptions,
          cardBasedOptions = cardBasedOptions,
          showInstallmentAmount = showInstallmentAmount,
        )
      } else {
        null
      }
    }

  private fun buildInstallmentOptions(
    values: List<Int>,
    plans: List<String>,
  ): InstallmentOptions {
    val installmentPlans = mutableListOf(InstallmentOptions.Plan.REGULAR)
    if (plans.any { it.equals(INSTALLMENT_PLAN_REVOLVING, ignoreCase = true) }) {
      installmentPlans.add(InstallmentOptions.Plan.REVOLVING)
    }
    return InstallmentOptions(
      values = values,
      plans = installmentPlans,
      preselectedValue = null,
    )
  }
}
