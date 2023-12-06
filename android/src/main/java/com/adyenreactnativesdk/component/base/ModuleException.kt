package com.adyenreactnativesdk.component.base

open class KnownException @JvmOverloads constructor(
    val code: String,
    errorMessage: String,
    cause: Throwable? = null
) : RuntimeException(errorMessage, cause)

sealed class ModuleException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class Canceled() : ModuleException(
        code = "canceledByShopper",
        message = "Payment canceled by shopper"
    )

    class NotSupported() : ModuleException(
        code = "notSupported",
        message = "Not supported on Android"
    )

    class NoClientKey() : ModuleException(
        code = "noClientKey",
        message = "No clientKey in configuration"
    )

    class NoPayment() : ModuleException(
        code = "noPayment",
        message = "No payment in configuration"
    )

    class InvalidPaymentMethods(e: Throwable?) : ModuleException(
        code = "invalidPaymentMethods",
        message = "Can not parse paymentMethods or the list is empty",
        cause = e
    )

    class InvalidAction(e: Throwable?) : ModuleException(
        code = "invalidAction",
        message = "Can not parse action",
        cause = e
    )

    class NoPaymentMethod(type: String) : ModuleException(
        code = "noPaymentMethod",
        message = "Can not find payment method of type $type in provided list"
    )

    class NoPaymentMethods(type: Collection<String>) : ModuleException(
        code = "noPaymentMethod",
        message = "Can not find payment method of types \"${type.joinToString(",")}\" in provided list"
    )

    class NoModuleListener : ModuleException(
        code = "noModuleListener",
        message = "Invalid state: DropInModuleListener is missing"
    )

    class Unknown(reason: String?) : ModuleException(
        code = "unknown",
        message = if (reason.isNullOrEmpty()) "Reason unknown" else reason
    )
}
