import type {
  ResultCode,
  PaymentAction,
  Order,
  PaymentMethod,
  PaymentAmount,
  BalanceResultCode,
  StoredPaymentMethod,
} from '@adyen/react-native';

export interface PaymentRequest {
  paymentMethod?: PaymentMethod;
  amount?: {
    value: number;
    currency: string;
  };
  returnUrl?: string;
  checkoutAttemptId?: string;
}

/**
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments#responses-200 API Explorer /payments response}
 */
export interface PaymentResponse {
  order?: Order;
  action?: PaymentAction;
  resultCode: ResultCode;
}

export type PaymentConfiguration = {
  shopperLocale: string;
  amount: number;
  currency: string;
  countryCode: string;
  merchantName?: string;
  merchantAccount: string;
  shopperReference: string;
};

export interface BalanceResponse {
  pspReference: string;
  resultCode: BalanceResultCode;
  balance: PaymentAmount;
  transactionLimit?: PaymentAmount;
  refusalReason?: string;
}

export interface OrderResponse {
  pspReference: string;
  resultCode: BalanceResultCode;
  expiresAt: string;
  orderData: string;
  reference: string;
  remainingAmount: PaymentAmount;
  amount: PaymentAmount;
}

export interface StoredCardPaymentMethod extends StoredPaymentMethod {
  expiryMonth?: string;
  expiryYear?: string;
  lastFour: string;
}