/**
 * General type for card.
 */
export class Card {
  /** PAN of card. */
  number?: string;

  /** Month in format MM. */
  expiryMonth?: string;

  /** Year in format YYYY. */
  expiryYear?: string;

  /** 3 or 4 digits. */
  cvv?: string;
}

/**
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments#responses-200-action API Explorer /payments action}
 */
export interface PaymentAction {
  /**
   * General type of action that needs to be taken by the client
   */
  type: string;

  /**
   * Refinement of type of action that needs to be taken by the client (currently only applies to the new 'threeDS2' type)
   */
  subtype?: string;

  /**
   * Specifies the payment method.
   */
  paymentMethodType: string;

  /**
   * When non-empty, contains a value that you must submit to the /payments/details endpoint. In some cases, required for polling.
   */
  paymentData?: string; // comes from the /payments endpoint

  // Redirect Actions

  /**
   * Specifies the HTTP method, for example GET or POST.
   */
  method?: string;

  /**
   * Specifies the URL to redirect to.
   */
  url?: string;

  // Vouchers

  alternativeReference?: string;
  downloadUrl?: string;
  entity?: string;
  expiresAt?: string;
  instructionsUrl?: string;
  issuer?: string;
  maskedTelephoneNumber?: string;
  merchantName?: string;
  merchantReference?: string;
  reference?: string;
  shopperEmail?: string;
  shopperName?: string;

  // QR Code

  qrCodeData?: string;

  // 3DS2

  /**
   * A token to pass to the 3DS2 Component to get the fingerprint/challenge.
   */
  token?: string;

  /**
   * A token needed to authorise a payment. Comes from the /submitThreeDS2Fingerprint endpoint
   */
  authorisationToken?: string;

  // SDK

  /**
   * An object containing data to be used in external SDKs like PayPal Buttons SDK.
   */
  sdkData?: {
    [key: string]: any;
  };
}

export interface PaymentMethod {
  /**
   * The unique payment method code.
   */
  type: string;

  /**
   * The displayable name of this payment method.
   */
  name: string;

  /**
   * All input details to be provided to complete the payment with this payment method.
   */
  details?: object;

  /**
   * Configuration props as set by the merchant in the CA and received in the PM object in the /paymentMethods response
   */
  configuration?: object;

  /**
   * Brand for the selected gift card. For example: plastix, hmclub.
   */
  brand?: string;

  /**
   * List of possible brands. For example: visa, mc.
   */
  brands?: string[];

  /**
   * The funding source of the payment method.
   */
  fundingSource?: string;

  /**
   * The group where this payment method belongs to.
   */
  group?: PaymentMethodGroup;
}

/**
 * The group where this payment method belongs to.
 */
export interface PaymentMethodGroup {
  /**
   * The name of the group.
   */
  name: string;

  /**
   * Echo data to be used if the payment method is displayed as part of this group.
   */
  paymentMethodData: string;

  /**
   * The unique code of the group.
   */
  type: string;
}

export interface StoredPaymentMethod extends PaymentMethod {
  /**
   * The supported shopper interactions for this stored payment method.
   */
  supportedShopperInteractions: string[];

  /**
   * A unique identifier of this stored payment method.
   */
  id: string;
}

/**
 * List of the available payment methods
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/paymentMethods#responses-200 API Explorer /paymentMethods}.
 */
export interface PaymentMethodsResponse {
  /**
   * Detailed list of payment methods required to generate payment forms.
   */
  paymentMethods: PaymentMethod[];

  /**
   * List of all stored payment methods.
   */
  storedPaymentMethods?: StoredPaymentMethod[];
}

/**
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments#request-amount API Explorer /payments amount}
 */
export interface PaymentAmount {
  value: number;
  currency: string;
}

/**
 * Use this object as basis for
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments API Explorer /payments request}
 */
export interface PaymentMethodData {
  paymentMethod: {
    type: string;
    [key: string]: any;
    checkoutAttemptId?: string;
  };
  browserInfo?: {
    userAgent: string;
  };
  /**
   * 	Contains passed-throught value for iOS or `adyencheckout://${DeviceInfo.getBundleId()}` for Android
   */
  returnUrl: string;
}

/**
 * Use this object as basis for
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments/details API Explorer /payments/details request}
 */
export interface PaymentDetailsData {
  details: any;
  paymentData?: string;
  authenticationData?: any;
}

/**
 * Session configuration
 */
export interface SessionConfiguration {
  id: string,
  sessionData: string
}

/**
 * Session container
 */
export interface SessionResponse {
  paymentMethods: PaymentMethodsResponse;
  [key: string]: any;
}

/** Reason for payment termination */
export interface AdyenError {
  message: string;
  errorCode: string;
}
