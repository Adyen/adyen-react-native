/*
 * Copyright (c) 2023 Adyen N.V.
 *
 * This file is open source and available under the MIT license. See the LICENSE file for more info.
 */

package com.adyenreactnativesdk.component.base

open class KnownException @JvmOverloads constructor(
    val code: String,
    errorMessage: String,
    cause: Throwable? = null
) : RuntimeException(errorMessage, cause)

sealed class ModuleException(code: String, message: String, cause: Throwable? = null) :
    KnownException(code = code, errorMessage = message, cause) {
    class Canceled : ModuleException(
        code = "canceledByShopper",
        message = "Payment canceled by shopper"
    )

    class NotSupported : ModuleException(
        code = "notSupported",
        message = "Not supported on Android"
    )

    class NoClientKey : ModuleException(
        code = "noClientKey",
        message = "No clientKey in configuration"
    )

    class NoPayment : ModuleException(
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

    class NoModuleListener(integration: String) : ModuleException(
        code = "noModuleListener",
        message = "No DropInService registered for: $integration"
    )

    class Unknown(reason: String?) : ModuleException(
        code = "unknown",
        message = if (reason.isNullOrEmpty()) "Reason unknown" else reason
    )

    class SessionError(error: Throwable?) : ModuleException(
        code = "session",
        message = "Something went wrong while starting session",
        cause = error
    )

    class NoActivity : ModuleException(
        code = "noActivity",
        message = "Launcher not registered. Please call AdyenCheckout.setLauncherActivity() on MainActivity.onCreate()"
    )

    class WrongFlow : ModuleException(
        code = "noActivity",
        message = "ViewModel callback is inconsistent"
    )
}
