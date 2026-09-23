/*
 * Copyright (c) 2026 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import com.adyen.checkout.core.common.CardBrand
import com.adyen.checkout.core.common.helper.CardExpiryDateValidationResult
import com.adyen.checkout.core.common.helper.CardExpiryDateValidator
import com.adyen.checkout.core.common.helper.CardNumberValidationResult
import com.adyen.checkout.core.common.helper.CardNumberValidator
import com.adyen.checkout.core.common.helper.CardSecurityCodeValidationResult
import com.adyen.checkout.core.common.helper.CardSecurityCodeValidator
import com.adyen.checkout.cse.CardEncrypter
import com.adyen.checkout.cse.EncryptionException
import com.adyen.checkout.cse.UnencryptedCard
import com.adyenreactnativesdk.react.NativeAdyenCSESpec
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import org.json.JSONObject

/** Stateless generated CSE TurboModule. No checkout or action state is retained between calls. */
class AdyenCSEModule(
  reactContext: ReactApplicationContext,
) : NativeAdyenCSESpec(reactContext) {
  override fun encryptCard(
    cardJson: String,
    publicKey: String,
    promise: Promise,
  ) {
    try {
      val card = JSONObject(cardJson)
      val unencryptedCardBuilder = UnencryptedCard.Builder()
      card.optString(NUMBER_KEY).takeIf(String::isNotEmpty)?.let(unencryptedCardBuilder::setNumber)
      val month = card.optString(EXPIRY_MONTH_KEY).takeIf(String::isNotEmpty)
      val year = card.optString(EXPIRY_YEAR_KEY).takeIf(String::isNotEmpty)
      if (month != null && year != null) {
        unencryptedCardBuilder.setExpiryDate(month, year)
      }
      card.optString(CVV_KEY).takeIf(String::isNotEmpty)?.let(unencryptedCardBuilder::setCvc)

      val encryptedCard = CardEncrypter.encryptFields(unencryptedCardBuilder.build(), publicKey)
      promise.resolve(
        JSONObject()
          .put(NUMBER_KEY, encryptedCard.encryptedCardNumber)
          .put(EXPIRY_MONTH_KEY, encryptedCard.encryptedExpiryMonth)
          .put(EXPIRY_YEAR_KEY, encryptedCard.encryptedExpiryYear)
          .put(CVV_KEY, encryptedCard.encryptedSecurityCode)
          .toString(),
      )
    } catch (error: EncryptionException) {
      promise.reject(ERROR_MESSAGE, error)
    } catch (error: Exception) {
      promise.reject(ERROR_MESSAGE, error)
    }
  }

  override fun encryptBin(
    bin: String,
    publicKey: String,
    promise: Promise,
  ) {
    try {
      promise.resolve(CardEncrypter.encryptBin(bin, publicKey))
    } catch (error: EncryptionException) {
      promise.reject(ERROR_MESSAGE, error)
    }
  }

  override fun validateCardNumber(
    cardNumber: String,
    enableLuhnCheck: Boolean,
    promise: Promise,
  ) {
    promise.resolve(CardNumberValidator.validateCardNumber(cardNumber, enableLuhnCheck) is CardNumberValidationResult.Valid)
  }

  override fun validateCardExpiryDate(
    expiryMonth: String,
    expiryYear: String,
    promise: Promise,
  ) {
    promise.resolve(CardExpiryDateValidator.validateExpiryDate(expiryMonth, expiryYear) is CardExpiryDateValidationResult.Valid)
  }

  override fun validateCardSecurityCode(
    securityCode: String,
    cardBrand: String?,
    promise: Promise,
  ) {
    val cardType = cardBrand?.let(::CardBrand)
    promise.resolve(CardSecurityCodeValidator.validateSecurityCode(securityCode, cardType) is CardSecurityCodeValidationResult.Valid)
  }

  private companion object {
    const val NUMBER_KEY = "number"
    const val EXPIRY_MONTH_KEY = "expiryMonth"
    const val EXPIRY_YEAR_KEY = "expiryYear"
    const val CVV_KEY = "cvv"
    const val ERROR_MESSAGE = "Encryption failed"
  }
}
