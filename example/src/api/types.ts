import type {
  ResultCode,
  PaymentAction,
  PaymentMethod,
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
  action?: PaymentAction;
  resultCode: ResultCode;
}

export type PaymentConfiguration = {
  shopperLocale: string;
  amount: number;
  currency: string;
  countryCode: string;
  merchantAccount: string;
  shopperReference: string;
};

export interface StoredCardPaymentMethod extends StoredPaymentMethod {
  expiryMonth?: string;
  expiryYear?: string;
  lastFour: string;
}
