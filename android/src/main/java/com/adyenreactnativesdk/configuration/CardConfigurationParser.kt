/*
 * Copyright (c) 2021 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */
package com.adyenreactnativesdk.configuration

import android.util.Log
import com.facebook.react.bridge.ReadableMap
import com.adyen.checkout.card.CardConfiguration
import com.adyen.checkout.bcmc.BcmcConfiguration
import com.adyen.checkout.card.AddressConfiguration
import com.adyen.checkout.card.AddressConfiguration.*
import com.adyen.checkout.card.KCPAuthVisibility
import com.adyen.checkout.card.data.CardType
import com.adyen.checkout.card.SocialSecurityNumberVisibility
import java.util.ArrayList

class CardConfigurationParser(config: ReadableMap) {

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
    }

    private var config: ReadableMap

    init {
        if (config.hasKey(CARD_KEY)) {
            this.config = config.getMap(CARD_KEY)!!
        } else {
            this.config = config
        }
    }

    fun getConfiguration(builder: CardConfiguration.Builder): CardConfiguration {
        if (config.hasKey(SUPPORTED_CARD_TYPES_KEY)) {
            builder.setSupportedCardTypes(*supportedCardTypes)
        }
        return builder
            .setShowStorePaymentField(showStorePaymentField)
            .setHideCvcStoredCard(hideCvcStoredCard)
            .setHideCvc(hideCvc)
            .setHolderNameRequired(holderNameRequired)
            .setAddressConfiguration(addressVisibility)
            .setKcpAuthVisibility(kcpVisibility)
            .setSocialSecurityNumberVisibility(socialSecurityNumberVisibility)
            .build()
    }

    fun getConfiguration(builder: BcmcConfiguration.Builder): BcmcConfiguration {
        return builder
            .setShowStorePaymentField(showStorePaymentField)
            .build()
    }

    private val showStorePaymentField: Boolean
        get() = if (config.hasKey(SHOW_STORE_PAYMENT_FIELD_KEY)) {
            config.getBoolean(SHOW_STORE_PAYMENT_FIELD_KEY)
        } else true

    private val holderNameRequired: Boolean
        get() = if (config.hasKey(HOLDER_NAME_REQUIRED_KEY)) {
            config.getBoolean(HOLDER_NAME_REQUIRED_KEY)
        } else false

    private val hideCvcStoredCard: Boolean
        get() = if (config.hasKey(HIDE_CVC_STORED_CARD_KEY)) {
            config.getBoolean(HIDE_CVC_STORED_CARD_KEY)
        } else true

    private val hideCvc: Boolean
        get() = if (config.hasKey(HIDE_CVC_KEY)) {
            config.getBoolean(HIDE_CVC_KEY)
        } else true

    private val kcpVisibility: KCPAuthVisibility
        get() {
            return if (config.hasKey(KCP_VISIBILITY_KEY)) {
                val value = config.getString(KCP_VISIBILITY_KEY)!!
                when (value.lowercase()) {
                    "show" -> KCPAuthVisibility.SHOW
                    else -> KCPAuthVisibility.HIDE
                }
            } else KCPAuthVisibility.HIDE
        }

    private val addressVisibility: AddressConfiguration
        get() {
            return when {
                config.hasKey(ADDRESS_VISIBILITY_KEY) -> {
                    val value = config.getString(ADDRESS_VISIBILITY_KEY)!!
                    when (value.lowercase()) {
                        "postal_code", "postal", "postalcode" -> PostalCode
                        "full" -> FullAddress(null, emptyList())
                        else -> None
                    }
                }
                else -> None
            }
        }

    private val supportedCardTypes: Array<CardType>
        get() {
            val array = config.getArray(SUPPORTED_CARD_TYPES_KEY)!!
            val size = array.size()
            val list: MutableList<CardType> = ArrayList(size)
            for (i in 0 until size) {
                val brandName = array.getString(i)
                val type = CardType.getByBrandName(brandName)
                if (type != null) list.add(type)
                else Log.w(TAG, "CardType not recognized: $brandName")
            }
            return list.toTypedArray()
        }

    private val socialSecurityNumberVisibility: SocialSecurityNumberVisibility
        get() {
            return when {
                config.hasKey(SOCIAL_SECURITY_VISIBILITY_KEY) -> {
                    val value = config.getString(SOCIAL_SECURITY_VISIBILITY_KEY)!!
                    when (value.lowercase()) {
                        "show" -> SocialSecurityNumberVisibility.SHOW
                        else -> SocialSecurityNumberVisibility.HIDE
                    }
                }
                else -> SocialSecurityNumberVisibility.HIDE
            }
        }

    // TODO: add InstallmentConfiguration getInstallmentConfiguration

}