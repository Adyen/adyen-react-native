/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import com.adyen.checkout.card.BillingAddressMode
import com.adyen.checkout.card.FieldVisibility
import com.adyen.checkout.card.InstallmentConfiguration
import com.adyen.checkout.card.card
import com.adyen.checkout.core.common.CardBrand
import com.adyen.checkout.core.components.CheckoutConfiguration
import com.adyenreactnativesdk.component.base.ModuleException
import com.facebook.react.bridge.ReadableMap

class CardConfigurationParser(
  config: ReadableMap,
  private val countryCode: String?,
) {
  companion object {
    const val TAG = "CardConfigurationParser"
    const val ROOT_KEY = "card"
    const val SHOW_STORE_PAYMENT_FIELD_KEY = "showStorePaymentField"
    const val HOLDER_NAME_REQUIRED_KEY = "holderNameRequired"
    const val HIDE_CVC_STORED_CARD_KEY = "hideCvcStoredCard"
    const val HIDE_CVC_KEY = "hideCvc"
    const val ADDRESS_VISIBILITY_KEY = "addressVisibility"
    const val KCP_VISIBILITY_KEY = "kcpVisibility"
    const val SOCIAL_SECURITY_VISIBILITY_KEY = "socialSecurity"
    const val SUPPORTED_CARD_TYPES_KEY = "supported"

    // TODO: v6 migration - supportedCountries (allowedAddressCountryCodes) not yet available in v6 card configuration
    const val SUPPORTED_COUNTRY_LIST_KEY = "allowedAddressCountryCodes"
    const val INSTALLMENT_OPTIONS_KEY = "installmentOptions"
    const val SHOW_INSTALLMENT_AMOUNT_KEY = "showInstallmentAmount"
  }

  private var config: ReadableMap

  init {
    if (config.hasKey(ROOT_KEY)) {
      this.config = config.getMap(ROOT_KEY)!!
    } else {
      this.config = config
    }
  }

  fun applyConfiguration(configuration: CheckoutConfiguration) {
    validateConfiguration()
    configuration.card(
      showCardholderName = holderNameRequired,
      showSecurityCode = showSecurityCode,
      showSecurityCodeForStoredCard = showSecurityCodeForStoredCard,
      showStorePaymentMethod = showStorePaymentField,
      socialSecurityNumberVisibility = socialSecurityNumberVisibility,
      koreanAuthenticationVisibility = koreanAuthenticationVisibility,
      supportedCardBrands = supportedCardBrands,
      billingAddressMode = billingAddressMode,
      installmentConfiguration = installmentConfiguration,
    )
  }

  /**
   * The pinned Android v6 alpha does not expose delegated address lookup for the presenter path.
   * Reject before configuring a controller so a lookup request cannot degrade to postal or full
   * address UI.
   */
  fun validateConfiguration() {
    if (usesAddressLookup) {
      throw ModuleException.UnsupportedAddressLookup()
    }
  }

  internal val showStorePaymentField: Boolean?
    get() =
      if (config.hasKey(SHOW_STORE_PAYMENT_FIELD_KEY)) {
        config.getBoolean(SHOW_STORE_PAYMENT_FIELD_KEY)
      } else {
        null
      }

  internal val holderNameRequired: Boolean?
    get() =
      if (config.hasKey(HOLDER_NAME_REQUIRED_KEY)) {
        config.getBoolean(HOLDER_NAME_REQUIRED_KEY)
      } else {
        null
      }

  internal val showSecurityCode: Boolean?
    get() =
      if (config.hasKey(HIDE_CVC_KEY)) {
        !config.getBoolean(HIDE_CVC_KEY)
      } else {
        null
      }

  internal val showSecurityCodeForStoredCard: Boolean?
    get() =
      if (config.hasKey(HIDE_CVC_STORED_CARD_KEY)) {
        !config.getBoolean(HIDE_CVC_STORED_CARD_KEY)
      } else {
        null
      }

  internal val koreanAuthenticationVisibility: FieldVisibility?
    get() {
      return if (config.hasKey(KCP_VISIBILITY_KEY)) {
        val value = config.getString(KCP_VISIBILITY_KEY)!!
        when (value.lowercase()) {
          "show" -> FieldVisibility.SHOW
          else -> FieldVisibility.HIDE
        }
      } else {
        null
      }
    }

  internal val billingAddressMode: BillingAddressMode?
    get() {
      return when {
        config.hasKey(ADDRESS_VISIBILITY_KEY) -> {
          val value = config.getString(ADDRESS_VISIBILITY_KEY)!!
          when (value.lowercase()) {
            "postal_code", "postal", "postalcode" -> BillingAddressMode.PostalCode()

            "none" -> BillingAddressMode.None()

            // "full" is not exposed by this v6 alpha. Lookup is rejected by
            // [validateConfiguration] before this value is read for an active checkout.
            else -> null
          }
        }

        else -> {
          null
        }
      }
    }

  internal val supportedCardBrands: List<CardBrand>?
    get() {
      return if (config.hasKey(SUPPORTED_CARD_TYPES_KEY)) {
        config
          .getArray(SUPPORTED_CARD_TYPES_KEY)
          ?.toArrayList()
          ?.map { CardBrand(it.toString()) }
      } else {
        null
      }
    }

  internal val socialSecurityNumberVisibility: FieldVisibility?
    get() {
      return when {
        config.hasKey(SOCIAL_SECURITY_VISIBILITY_KEY) -> {
          val value = config.getString(SOCIAL_SECURITY_VISIBILITY_KEY)!!
          when (value.lowercase()) {
            "show" -> FieldVisibility.SHOW
            else -> FieldVisibility.HIDE
          }
        }

        else -> {
          null
        }
      }
    }

  internal val installmentConfiguration: InstallmentConfiguration?
    get() {
      return when {
        config.hasKey(INSTALLMENT_OPTIONS_KEY) -> {
          val installmentOptionsMap = config.getMap(INSTALLMENT_OPTIONS_KEY) ?: return null
          val showInstallmentAmount =
            if (config.hasKey(SHOW_INSTALLMENT_AMOUNT_KEY)) {
              config.getBoolean(SHOW_INSTALLMENT_AMOUNT_KEY)
            } else {
              false
            }
          InstallmentConfigurationParser(
            installmentOptionsMap,
            showInstallmentAmount,
          ).installmentConfiguration
        }

        else -> {
          null
        }
      }
    }

  private val usesAddressLookup: Boolean
    get() =
      config.hasKey(ADDRESS_VISIBILITY_KEY) &&
        config.getString(ADDRESS_VISIBILITY_KEY)?.equals("lookup", ignoreCase = true) == true
}
