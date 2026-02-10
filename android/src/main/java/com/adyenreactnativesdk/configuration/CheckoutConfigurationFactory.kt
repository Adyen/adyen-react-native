package com.adyenreactnativesdk.configuration

import com.adyen.checkout.adyen3ds2.adyen3DS2
import com.adyen.checkout.bcmc.bcmc
import com.adyen.checkout.card.card
import com.adyen.checkout.components.core.CheckoutConfiguration
import com.adyen.checkout.dropin.dropIn
import com.adyen.checkout.giftcard.giftCard
import com.adyen.checkout.googlepay.googlePay
import com.adyenreactnativesdk.component.base.ModuleException
import com.facebook.react.bridge.ReadableMap

object CheckoutConfigurationFactory {
  fun get(json: ReadableMap): CheckoutConfiguration {
    val rootParser = RootConfigurationParser(json)
    val countryCode = rootParser.countryCode
    val analyticsConfiguration = AnalyticsParser(json).analytics

    val clientKey = rootParser.clientKey ?: throw ModuleException.NoClientKey()
    return CheckoutConfiguration(
      environment = rootParser.environment,
      clientKey = clientKey,
      shopperLocale = rootParser.locale,
      amount = rootParser.amount,
      analyticsConfiguration = analyticsConfiguration,
    ) {
      googlePay {
        setCountryCode(countryCode)
        val googlePayParser = GooglePayConfigurationParser(json)
        googlePayParser.applyConfiguration(this)
      }
      val cardParser = CardConfigurationParser(json, countryCode)
      card {
        cardParser.applyConfiguration(this)
      }
      bcmc {
        cardParser.applyConfiguration(this)
      }
      dropIn {
        val parser = DropInConfigurationParser(json)
        parser.applyConfiguration(this)
      }
      adyen3DS2 {
        val parser = ThreeDSConfigurationParser(json)
        parser.applyConfiguration(this)
      }
      giftCard {
        val parser = PartialPaymentParser(json)
        setPinRequired(parser.pinRequired)
      }
    }
  }
}
