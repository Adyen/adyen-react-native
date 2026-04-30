/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import com.adyen.checkout.card.CardBrand
import com.adyen.checkout.card.CardType
import com.adyen.checkout.card.InstallmentConfiguration
import com.adyen.checkout.card.InstallmentOptions
import com.facebook.react.bridge.ReadableMap

internal class InstallmentConfigurationParser(
  private val config: ReadableMap,
  private val showInstallmentAmount: Boolean = true,
) {
  companion object {
    private const val INSTALLMENT_VALUES_KEY = "values"
    private const val INSTALLMENT_PLANS_KEY = "plans"
    private const val INSTALLMENT_DEFAULT_KEY = "card"
    private const val INSTALLMENT_PLAN_REVOLVING = "revolving"
  }

  val installmentConfiguration: InstallmentConfiguration?
    get() {
      var defaultOptions: InstallmentOptions.DefaultInstallmentOptions? = null
      val cardBasedOptions = mutableListOf<InstallmentOptions.CardBasedInstallmentOptions>()

      val iterator = config.keySetIterator()
      while (iterator.hasNextKey()) {
        val key = iterator.nextKey()
        val optionMap = config.getMap(key) ?: continue

        val values =
          optionMap.getArray(INSTALLMENT_VALUES_KEY)?.toArrayList()?.mapNotNull { it as? Int } ?: continue
        val plans =
          if (optionMap.hasKey(INSTALLMENT_PLANS_KEY)) {
            optionMap.getArray(INSTALLMENT_PLANS_KEY)?.toArrayList()?.map { it.toString() } ?: emptyList()
          } else {
            emptyList()
          }
        val includeRevolving = plans.contains(INSTALLMENT_PLAN_REVOLVING)

        if (key.equals(INSTALLMENT_DEFAULT_KEY, ignoreCase = true)) {
          // Default options for all cards
          defaultOptions = InstallmentOptions.DefaultInstallmentOptions(values, includeRevolving)
        } else {
          // Card-specific options
          val cardType = CardType.getByBrandName(key)
          if (cardType != null) {
            cardBasedOptions.add(
              InstallmentOptions.CardBasedInstallmentOptions(
                values,
                includeRevolving,
                CardBrand(cardType),
              ),
            )
          }
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
}
