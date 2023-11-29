package com.adyenreactnativesdk.cse

import com.adyen.checkout.cse.CardEncrypter
import com.adyen.checkout.cse.EncryptionException
import com.adyen.checkout.cse.UnencryptedCard
import com.facebook.react.bridge.*

class AdyenCSEModule(context: ReactApplicationContext?) : ReactContextBaseJavaModule(context) {

    @ReactMethod
    fun addListener(eventName: String?) { /* No JS events expected */ }

    @ReactMethod
    fun removeListeners(count: Int?) { /* No JS events expected */ }
    
    override fun getName() = COMPONENT_NAME

    @ReactMethod
    fun encryptCard(card: ReadableMap, publicKey: String, promise: Promise) {
        val unencryptedCardBuilder = UnencryptedCard.Builder()
        card.getString(NUMBER_KEY)?.let { unencryptedCardBuilder.setNumber(it) }
        val month = card.getString(EXPIRY_MONTH_KEY)
        val year = card.getString(EXPIRY_YEAR_KEY)
        if (month != null && year != null) {
            unencryptedCardBuilder.setExpiryDate(month, year)
        }
        card.getString(CVV_KEY)?.let { unencryptedCardBuilder.setCvc(it) }

        try {
            val encryptedCard = CardEncrypter.encryptFields(unencryptedCardBuilder.build(), publicKey)
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
    fun encryptBin(bin: String, publicKey: String, promise: Promise) {
        try {
            val encryptedBin = CardEncrypter.encryptBin(bin, publicKey)
            promise.resolve(encryptedBin)
        } catch (e: EncryptionException) {
            promise.reject(ERROR_MESSAGE, e)
        }
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