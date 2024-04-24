/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.configuration

import com.adyen.checkout.googlepay.GooglePayConfiguration
import com.facebook.react.bridge.ReadableArray
import org.junit.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`

class GooglePayConfigurationParserTest {

    @Test
    fun applyConfiguration() {
        val config = WritableMapMock()

        config.putBoolean(GooglePayConfigurationParser.ALLOW_PREPAID_CARDS_KEY, true)
        config.putBoolean(GooglePayConfigurationParser.ALLOW_CREDIT_CARDS_KEY, true)
        config.putBoolean(GooglePayConfigurationParser.EMAIL_REQUIRED_KEY, true)
        config.putBoolean(GooglePayConfigurationParser.SHIPPING_ADDRESS_REQUIRED_KEY, true)
        config.putBoolean(GooglePayConfigurationParser.BILLING_ADDRESS_REQUIRED_KEY, true)
        config.putString(GooglePayConfigurationParser.TOTAL_PRICE_STATUS_KEY, "FINAL")
        config.putString(GooglePayConfigurationParser.MERCHANT_ACCOUNT_KEY, "Merchant_account")
        // TODO: add billing address tests
        // TODO: add shipping address configuration tests

        val allowedAuthArray = mock(ReadableArray::class.java)
        `when`(allowedAuthArray.toArrayList()).thenReturn(arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_AUTH_METHODS_KEY, allowedAuthArray)

        val allowedCardArray = mock(ReadableArray::class.java)
        `when`(allowedCardArray.toArrayList()).thenReturn(arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value"))
        config.putArray(GooglePayConfigurationParser.ALLOWED_CARD_NETWORKS_KEY, allowedCardArray)

        // WHEN
        val sut = GooglePayConfigurationParser(config)
        val mockBuilder = mock(GooglePayConfiguration.Builder::class.java)
        sut.applyConfiguration(mockBuilder)

        // THEN
        verify(mockBuilder, times(1)).setAllowedAuthMethods(arrayListOf("PAN_ONLY", "CRYPTOGRAM_3DS"))
        verify(mockBuilder, times(1)).setAllowedCardNetworks(arrayListOf("MASTERCARD", "VISA", "amex", "wrong_value"))
        verify(mockBuilder, times(1)).setAllowCreditCards(true)
        verify(mockBuilder, times(1)).setAllowPrepaidCards(true)
        verify(mockBuilder, times(1)).setEmailRequired(true)
        verify(mockBuilder, times(1)).setShippingAddressRequired(true)
        verify(mockBuilder, times(1)).setBillingAddressRequired(true)
        verify(mockBuilder, times(1)).setTotalPriceStatus("FINAL")
        verify(mockBuilder, times(1)).setMerchantAccount("Merchant_account")
    }
}