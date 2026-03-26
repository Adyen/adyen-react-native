/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.cse

import com.adyen.checkout.cse.CardEncrypter
import com.adyen.checkout.cse.EncryptionException
import com.adyen.checkout.cse.UnencryptedCard
import com.adyen.checkout.core.CardBrand
import com.adyen.checkout.core.ui.model.ExpiryDate
import com.adyen.checkout.core.ui.validation.CardExpiryDateValidationResult
import com.adyen.checkout.core.ui.validation.CardExpiryDateValidator
import com.adyen.checkout.core.ui.validation.CardNumberValidationResult
import com.adyen.checkout.core.ui.validation.CardNumberValidator
import com.adyen.checkout.core.ui.validation.CardSecurityCodeValidationResult
import com.adyen.checkout.core.ui.validation.CardSecurityCodeValidator
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableNativeMap

class AdyenCSEModule(
  context: ReactApplicationContext?,
) : ReactContextBaseJavaModule(context) {
  @ReactMethod
  fun addListener(eventName: String?) { // No JS events expected
  }

  @ReactMethod
  fun removeListeners(count: Int?) { // No JS events expected
  }

  override fun getName() = COMPONENT_NAME

  @ReactMethod
  fun encryptCard(
    card: ReadableMap,
    publicKey: String,
    promise: Promise,
  ) {
    val unencryptedCardBuilder = UnencryptedCard.Builder()
    card.getString(NUMBER_KEY)?.let { unencryptedCardBuilder.setNumber(it) }
    val month = card.getString(EXPIRY_MONTH_KEY)
    val year = card.getString(EXPIRY_YEAR_KEY)
    if (month != null && year != null) {
      unencryptedCardBuilder.setExpiryDate(month, year)
    }
    card.getString(CVV_KEY)?.let { unencryptedCardBuilder.setCvc(it) }

    try {
      val encryptedCard =
        CardEncrypter.encryptFields(unencryptedCardBuilder.build(), publicKey)
      val map = WritableNativeMap()
      map.putString(NUMBER_KEY, encryptedCard.encryptedCardNumber)
      map.putString(EXPIRY_MONTH_KEY, encryptedCard.encryptedExpiryMonth)
      map.putString(EXPIRY_YEAR_KEY, encryptedCard.encryptedExpiryYear)
      map.putString(CVV_KEY, encryptedCard.encryptedSecurityCode)
      promise.resolve(map)
    } catch (e: EncryptionException) {
      promise.reject(ERROR_MESSAGE, e)
    }
  }

  @ReactMethod
  fun encryptBin(
    bin: String,
    publicKey: String,
    promise: Promise,
  ) {
    try {
      val encryptedBin = CardEncrypter.encryptBin(bin, publicKey)
      promise.resolve(encryptedBin)
    } catch (e: EncryptionException) {
      promise.reject(ERROR_MESSAGE, e)
    }
  }

  @ReactMethod
  fun validateCardNumber(
    cardNumber: String,
    enableLuhnCheck: Boolean,
    promise: Promise,
  ) {
    val validationResult = CardNumberValidator.validateCardNumber(cardNumber, enableLuhnCheck)
    promise.resolve(validationResult is CardNumberValidationResult.Valid)
  }

  @ReactMethod
  fun validateCardExpiryDate(
    expiryMonth: String,
    expiryYear: String,
    promise: Promise,
  ) {
    val expireMonth = expiryMonth.toIntOrNull()
    val expireYear = expiryYear.toIntOrNull()
    if (expireMonth == null || expireYear == null) {
      promise.resolve(false)
      return
    }

    val expiryDate = ExpiryDate(expireMonth, expireYear)
    val validationResult = CardExpiryDateValidator.validateExpiryDate(expiryDate)
    promise.resolve(validationResult is CardExpiryDateValidationResult.Valid)
  }

  @ReactMethod
  fun validateCardSecurityCode(
    securityCode: String,
    cardBrand: String?,
    promise: Promise,
  ) {
    val cardType = cardBrand?.let { CardBrand(it) }
    val validationResult = CardSecurityCodeValidator.validateSecurityCode(securityCode, cardType)
    promise.resolve(validationResult is CardSecurityCodeValidationResult.Valid)
  }

  companion object {
    private const val TAG = "AdyenCSE"
    private const val COMPONENT_NAME = "AdyenCSE"
    private const val NUMBER_KEY = "number"
    private const val EXPIRY_MONTH_KEY = "expiryMonth"
    private const val EXPIRY_YEAR_KEY = "expiryYear"
    private const val CVV_KEY = "cvv"
    private const val ERROR_MESSAGE = "Encryption failed"
  }
}
