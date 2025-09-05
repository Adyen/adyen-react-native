import type {
  ResultCode,
  PaymentAction,
  Order,
  PaymentMethod,
  PaymentAmount,
  BalanceResultCode,
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
  merchantName?: any;
  merchantAccount: string;
  shopperReference: string;
};

export interface SessionResponse {
  id: string;
  sessionData: string;
}

export interface BalanceResponse {
  pspReference: string;
  resultCode: BalanceResultCode;
  balance: PaymentAmount;
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
