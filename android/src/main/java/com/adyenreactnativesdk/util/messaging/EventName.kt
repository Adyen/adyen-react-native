package com.adyenreactnativesdk.util.messaging

enum class EventName(
  val value: String,
) {
  COMPLETE_VOUCHER("didCompleteCallback"),
  COMPLETE_SESSION("didSessionCompleteCallback"),
  ADDITIONAL_DETAILS("didProvideCallback"),
  ERROR("didFailCallback"),
  SESSION_ERROR("didSessionErrorCallback"),
  BEFORE_SUBMIT("didBeforeSubmitCallback"),
  SUBMIT("didSubmitCallback"),
  UPDATE_ADDRESS("didUpdateAddressCallback"),
  CONFIRM_ADDRESS("didConfirmAddressCallback"),
  DISABLE_STORED_PAYMENT_METHOD("didDisableStoredPaymentMethodCallback"),
  CHECK_BALANCE("didCheckBalanceCallback"),
  REQUEST_ORDER("didRequestOrderCallback"),
  CANCEL_ORDER("didCancelOrderCallback"),
  BIN_LOOKUP("didBinLookupCallback"),
  CHANGE_BIN_VALUE("didChangeBinValueCallback"), ;

  companion object
}

fun EventName.Companion.coreEvents() =
  listOf(
    EventName.SUBMIT.value,
    EventName.ERROR.value,
    EventName.COMPLETE_VOUCHER.value,
    EventName.ADDITIONAL_DETAILS.value,
  )

fun EventName.Companion.sessionEvents() =
  listOf(
    EventName.SESSION_ERROR.value,
    EventName.COMPLETE_SESSION.value,
    EventName.BEFORE_SUBMIT.value,
  )

fun EventName.Companion.addressLookupEvents() =
  listOf(
    EventName.UPDATE_ADDRESS.value,
    EventName.CONFIRM_ADDRESS.value,
  )

fun EventName.Companion.cardEvents() =
  listOf(
    EventName.BIN_LOOKUP.value,
    EventName.CHANGE_BIN_VALUE.value,
  )

fun EventName.Companion.dropInEvents() =
  listOf(
    EventName.DISABLE_STORED_PAYMENT_METHOD.value,
    EventName.CHECK_BALANCE.value,
    EventName.REQUEST_ORDER.value,
    EventName.CANCEL_ORDER.value,
  )
