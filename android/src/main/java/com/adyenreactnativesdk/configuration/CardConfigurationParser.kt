/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.AddressConfiguration
import com.adyen.checkout.card.AddressConfiguration.FullAddress
import com.adyen.checkout.card.AddressConfiguration.None
import com.adyen.checkout.card.AddressConfiguration.PostalCode
import com.adyen.checkout.card.CardBrand
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.card.CardType
import com.adyen.checkout.card.InstallmentConfiguration
import com.adyen.checkout.card.KCPAuthVisibility
import com.adyen.checkout.card.SocialSecurityNumberVisibility
import com.facebook.react.bridge.ReadableMap

class CardConfigurationParser(
  config: ReadableMap,
  private val countryCode: String?,
) {
  companion object {
    const val TAG = "CardConfigurationParser"
    const val ROOT_KEY = "card"
    const val SHOW_SUBMIT_BUTTON_KEY = "showSubmitButton"
    const val SHOW_STORE_PAYMENT_FIELD_KEY = "showStorePaymentField"
    const val HOLDER_NAME_REQUIRED_KEY = "holderNameRequired"
    const val HIDE_CVC_STORED_CARD_KEY = "hideCvcStoredCard"
    const val HIDE_CVC_KEY = "hideCvc"
    const val ADDRESS_VISIBILITY_KEY = "addressVisibility"
    const val KCP_VISIBILITY_KEY = "kcpVisibility"
    const val SOCIAL_SECURITY_VISIBILITY_KEY = "socialSecurity"
    const val SUPPORTED_CARD_TYPES_KEY = "supported"
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

  fun applyConfiguration(builder: CardConfiguration.Builder) {
    supportedCardTypes?.let { builder.supportedCardBrands = it }
    showSubmitButton?.let { builder.isSubmitButtonVisible = it }
    showStorePaymentField?.let { builder.isStorePaymentFieldVisible = it }
    hideCvcStoredCard?.let { builder.isHideCvcStoredCard = it }
    hideCvc?.let { builder.isHideCvc = it }
    holderNameRequired?.let { builder.isHolderNameRequired = it }
    addressVisibility?.let { builder.addressConfiguration = it }
    kcpVisibility?.let { builder.kcpAuthVisibility = it }
    socialSecurityNumberVisibility?.let { builder.socialSecurityNumberVisibility = it }
    installmentConfiguration?.let { builder.installmentConfiguration = it }
  }

  fun applyConfiguration(builder: BcmcConfiguration.Builder) {
    showStorePaymentField?.let { builder.showStorePaymentField = it }
    holderNameRequired?.let { builder.isHolderNameRequired = it }
  }

  private val showSubmitButton: Boolean?
    get() =
      if (config.hasKey(SHOW_SUBMIT_BUTTON_KEY)) {
        config.getBoolean(SHOW_SUBMIT_BUTTON_KEY)
      } else {
        null
      }

  private val showStorePaymentField: Boolean?
    get() =
      if (config.hasKey(SHOW_STORE_PAYMENT_FIELD_KEY)) {
        config.getBoolean(SHOW_STORE_PAYMENT_FIELD_KEY)
      } else {
        null
      }

  private val holderNameRequired: Boolean?
    get() =
      if (config.hasKey(HOLDER_NAME_REQUIRED_KEY)) {
        config.getBoolean(HOLDER_NAME_REQUIRED_KEY)
      } else {
        null
      }

  private val hideCvcStoredCard: Boolean?
    get() =
      if (config.hasKey(HIDE_CVC_STORED_CARD_KEY)) {
        config.getBoolean(HIDE_CVC_STORED_CARD_KEY)
      } else {
        null
      }

  private val hideCvc: Boolean?
    get() =
      if (config.hasKey(HIDE_CVC_KEY)) {
        config.getBoolean(HIDE_CVC_KEY)
      } else {
        null
      }

  private val supportedCountries: List<String>?
    get() =
      if (config.hasKey(SUPPORTED_COUNTRY_LIST_KEY)) {
        config.getArray(SUPPORTED_COUNTRY_LIST_KEY)?.toArrayList()?.map { it.toString() }
      } else {
        null
      }

  private val kcpVisibility: KCPAuthVisibility?
    get() {
      return if (config.hasKey(KCP_VISIBILITY_KEY)) {
        val value = config.getString(KCP_VISIBILITY_KEY)!!
        when (value.lowercase()) {
          "show" -> KCPAuthVisibility.SHOW
          else -> KCPAuthVisibility.HIDE
        }
      } else {
        null
      }
    }

  internal val addressVisibility: AddressConfiguration?
    get() {
      return when {
        config.hasKey(ADDRESS_VISIBILITY_KEY) -> {
          val value = config.getString(ADDRESS_VISIBILITY_KEY)!!
          when (value.lowercase()) {
            "postal_code", "postal", "postalcode" -> PostalCode()
            "full" -> FullAddress(countryCode, supportedCountries.orEmpty())
            "lookup" -> AddressConfiguration.Lookup()
            else -> None
          }
        }

        else -> {
          null
        }
      }
    }

  internal val supportedCardTypes: List<CardBrand>?
    get() {
      return if (config.hasKey(SUPPORTED_CARD_TYPES_KEY)) {
        config
          .getArray(SUPPORTED_CARD_TYPES_KEY)
          ?.toArrayList()
          ?.map { it.toString() }
          ?.mapNotNull { txVariant ->
            CardType.getByBrandName(txVariant)?.let {
              CardBrand(it)
            }
          }
      } else {
        null
      }
    }

  private val socialSecurityNumberVisibility: SocialSecurityNumberVisibility?
    get() {
      return when {
        config.hasKey(SOCIAL_SECURITY_VISIBILITY_KEY) -> {
          val value = config.getString(SOCIAL_SECURITY_VISIBILITY_KEY)!!
          when (value.lowercase()) {
            "show" -> SocialSecurityNumberVisibility.SHOW
            else -> SocialSecurityNumberVisibility.HIDE
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
}
