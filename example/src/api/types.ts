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

export type CardSettings = {
  holderNameRequired?: boolean;
  addressVisibility?: 'full' | 'postalCode' | 'none' | 'lookup';
  showStorePaymentField?: boolean;
  hideCvcStoredCard?: boolean;
  hideCvc?: boolean;
  kcpVisibility?: 'show' | 'hide';
  socialSecurity?: 'show' | 'hide';
};

export type DropInSettings = {
  showPreselectedStoredPaymentMethod?: boolean;
  skipListWhenSinglePaymentMethod?: boolean;
  showRemovePaymentMethodButton?: boolean;
  title?: string;
};

export type ApplePaySettings = {
  merchantID?: string;
  merchantName?: string;
  allowOnboarding?: boolean;
  shippingType?: 'shipping' | 'delivery' | 'storePickup' | 'servicePickup';
};

export type GooglePaySettings = {
  allowPrepaidCards?: boolean;
  allowCreditCards?: boolean;
  billingAddressRequired?: boolean;
  emailRequired?: boolean;
  shippingAddressRequired?: boolean;
  existingPaymentMethodRequired?: boolean;
  totalPriceStatus?: 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';
};

export type PaymentConfiguration = {
  shopperLocale: string;
  amount: number;
  currency: string;
  countryCode: string;
  merchantName?: string;
  merchantAccount: string;
  shopperReference: string;
  cardSettings?: CardSettings;
  dropInSettings?: DropInSettings;
  applePaySettings?: ApplePaySettings;
  googlePaySettings?: GooglePaySettings;
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
