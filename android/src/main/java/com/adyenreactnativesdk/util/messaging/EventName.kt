package com.adyenreactnativesdk.util.messaging

enum class EventName(
  val value: String,
) {
  COMPLETE_VOUCHER("didCompleteCallback"),
  COMPLETE_SESSION("didSessionCompleteCallback"),
  ADDITIONAL_DETAILS("didProvideCallback"),
  ERROR("didFailCallback"),
  SESSION_ERROR("didSessionErrorCallback"),
  SUBMIT("didSubmitCallback"),
  UPDATE_ADDRESS("didUpdateAddressCallback"),
  CONFIRM_ADDRESS("didConfirmAddressCallback"),
  DISABLE_STORED_PAYMENT_METHOD("didDisableStoredPaymentMethodCallback"),
  CHECK_BALANCE("didCheckBalanceCallback"),
  REQUEST_ORDER("didRequestOrderCallback"),
  CANCEL_ORDER("didCancelOrderCallback"),
  BIN_LOOKUP("didBinLookupCallback"),
  CHANGE_BIN_VALUE("didChangeBinValueCallback"),
}
