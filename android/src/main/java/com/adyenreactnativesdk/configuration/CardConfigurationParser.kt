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
import com.adyen.checkout.card.KCPAuthVisibility
import com.adyen.checkout.card.SocialSecurityNumberVisibility
import com.facebook.react.bridge.ReadableMap

class CardConfigurationParser(config: ReadableMap, private val countryCode: String?) {

    companion object {
        const val TAG = "CardConfigurationParser"
        const val CARD_KEY = "card"
        const val SHOW_STORE_PAYMENT_FIELD_KEY = "showStorePaymentField"
        const val HOLDER_NAME_REQUIRED_KEY = "holderNameRequired"
        const val HIDE_CVC_STORED_CARD_KEY = "hideCvcStoredCard"
        const val HIDE_CVC_KEY = "hideCvc"
        const val ADDRESS_VISIBILITY_KEY = "addressVisibility"
        const val KCP_VISIBILITY_KEY = "kcpVisibility"
        const val SOCIAL_SECURITY_VISIBILITY_KEY = "socialSecurity"
        const val SUPPORTED_CARD_TYPES_KEY = "supported"
        const val SUPPORTED_COUNTRY_LIST_KEY = "allowedAddressCountryCodes"
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(CARD_KEY)) {
            this.config = config.getMap(CARD_KEY)!!
        } else {
            this.config = config
        }
    }

    fun applyConfiguration(builder: CardConfiguration.Builder) {
        supportedCardTypes?.let { builder.setSupportedCardTypes(*it.toTypedArray()) }
        showStorePaymentField?.let { builder.setShowStorePaymentField(it) }
        hideCvcStoredCard?.let { builder.setHideCvcStoredCard(it) }
        hideCvc?.let { builder.setHideCvc(it) }
        holderNameRequired?.let { builder.setHolderNameRequired(it) }
        addressVisibility?.let { builder.setAddressConfiguration(it) }
        kcpVisibility?.let { builder.setKcpAuthVisibility(it) }
        socialSecurityNumberVisibility?.let { builder.setSocialSecurityNumberVisibility(it) }
    }

    fun applyConfiguration(builder: BcmcConfiguration.Builder) {
        showStorePaymentField?.let { builder.setShowStorePaymentField(it) }
        holderNameRequired?.let { builder.setHolderNameRequired(it) }
    }

    private val showStorePaymentField: Boolean?
        get() = if (config.hasKey(SHOW_STORE_PAYMENT_FIELD_KEY)) {
            config.getBoolean(SHOW_STORE_PAYMENT_FIELD_KEY)
        } else null

    private val holderNameRequired: Boolean?
        get() = if (config.hasKey(HOLDER_NAME_REQUIRED_KEY)) {
            config.getBoolean(HOLDER_NAME_REQUIRED_KEY)
        } else null

    private val hideCvcStoredCard: Boolean?
        get() = if (config.hasKey(HIDE_CVC_STORED_CARD_KEY)) {
            config.getBoolean(HIDE_CVC_STORED_CARD_KEY)
        } else null

    private val hideCvc: Boolean?
        get() = if (config.hasKey(HIDE_CVC_KEY)) {
            config.getBoolean(HIDE_CVC_KEY)
        } else null

    private val supportedCountries: List<String>?
        get() = if (config.hasKey(SUPPORTED_COUNTRY_LIST_KEY)) {
            config.getArray(SUPPORTED_COUNTRY_LIST_KEY)?.toArrayList()?.map { it.toString() }
        } else null

    private  val kcpVisibility: KCPAuthVisibility?
        get() {
            return if (config.hasKey(KCP_VISIBILITY_KEY)) {
                val value = config.getString(KCP_VISIBILITY_KEY)!!
                when (value.lowercase()) {
                    "show" -> KCPAuthVisibility.SHOW
                    else -> KCPAuthVisibility.HIDE
                }
            } else null
        }

    internal val addressVisibility: AddressConfiguration?
        get() {
            return when {
                config.hasKey(ADDRESS_VISIBILITY_KEY) -> {
                    val value = config.getString(ADDRESS_VISIBILITY_KEY)!!
                    when (value.lowercase()) {
                        "postal_code", "postal", "postalcode" -> PostalCode()
                        "full" -> FullAddress(countryCode, supportedCountries.orEmpty())
                        else -> None
                    }
                }

                else -> null
            }
        }

    internal val supportedCardTypes: List<CardBrand>?
        get() {
            return if (config.hasKey(SUPPORTED_CARD_TYPES_KEY))
                config.getArray(SUPPORTED_CARD_TYPES_KEY)
                    ?.toArrayList()
                    ?.map { it.toString() }
                    ?.mapNotNull { txVariant ->
                    CardType.getByBrandName(txVariant)?.let {
                        CardBrand(it)
                    }
                }
            else null
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

                else -> null
            }
        }

    // TODO: add InstallmentConfiguration getInstallmentConfiguration

}