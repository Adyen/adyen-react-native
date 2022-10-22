package com.adyenreactnativesdk.component

open class KnownException @JvmOverloads constructor(
    val code: String,
    errorMessage: String,
    cause: Throwable? = null
) : RuntimeException(errorMessage, cause)

class BaseModuleException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    companion object {
        val CANCELED = BaseModuleException(
            code = "canceledByShopper",
            message = "Payment canceled by shopper"
        )
        val NOT_SUPPORTED = BaseModuleException(
            code = "notSupported",
            message = "Not supported on Android"
        )
        val NO_CLIENT_KEY = BaseModuleException(
            code = "noClientKey",
            message = "No clientKey in configuration"
        )
        val NO_PAYMENT = BaseModuleException(
            code = "noPayment",
            message = "No payment in configuration"
        )
        val INVALID_PAYMENT_METHODS = BaseModuleException(
            code = "invalidPaymentMethods",
            message = "Can not parse paymentMethods or the list is empty"
        )
        val INVALID_ACTION = BaseModuleException(
            code = "invalidAction",
            message = "Can not parse action"
        )

        fun noPaymentMethod(type: String): BaseModuleException {
            return BaseModuleException(
                code = "noPaymentMethod",
                message = "Can not find payment method of type $type in provided list"
            )
        }
    }
}
