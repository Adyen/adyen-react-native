package com.adyenreactnativesdk.component

open class KnownException @JvmOverloads constructor(
    val code: String,
    errorMessage: String,
    cause: Throwable? = null
) : RuntimeException(errorMessage, cause)

sealed class BaseModuleException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class Canceled() : BaseModuleException(
        code = "canceledByShopper",
        message = "Payment canceled by shopper"
    )

    class NotSupported() : BaseModuleException(
        code = "notSupported",
        message = "Not supported on Android"
    )

    class NoClientKey() : BaseModuleException(
        code = "noClientKey",
        message = "No clientKey in configuration"
    )

    class NoPayment() : BaseModuleException(
        code = "noPayment",
        message = "No payment in configuration"
    )

    class InvalidPaymentMethods(e: Throwable?) : BaseModuleException(
        code = "invalidPaymentMethods",
        message = "Can not parse paymentMethods or the list is empty",
        cause = e
    )

    class InvalidAction(e: Throwable?) : BaseModuleException(
        code = "invalidAction",
        message = "Can not parse action",
        cause = e
    )

    class NoPaymentMethod(type: String) : BaseModuleException(
        code = "noPaymentMethod",
        message = "Can not find payment method of type $type in provided list"
    )

    class NoPaymentMethods(type: Collection<String>) : BaseModuleException(
        code = "noPaymentMethod",
        message = "Can not find payment method of types \"${type.joinToString(",")}\" in provided list"
    )
}
