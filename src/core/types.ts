import type { Configuration } from './configurations/Configuration';
import type { ResultCode } from './constants';

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
 * Result of a merchant `/payments` or `/payments/details` call, forwarded to the native bridge to
 * resume a Drop-in advanced-flow submission.
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments API Explorer /payments response}
 */
export interface PaymentResult {
  /** The result code indicating the payment outcome. */
  resultCode?: ResultCode;
  /** An action to be handled by the component when the payment requires additional steps. */
  action?: PaymentAction;
  /** The reason a payment was refused, optionally surfaced to the shopper before a retry. */
  refusalReason?: string;
  [key: string]: unknown;
}

/**
 * Session configuration
 */
export interface SessionConfiguration {
  id: string;
  sessionData: string;
}

/**
 * Reason for payment termination
 */
export interface AdyenError {
  message: string;
  errorCode: string;
}

export interface SubmitModel {
  paymentData: PaymentMethodData;
  extra?: any;
}

export interface Balance {
  /**
   * The balance for the payment method.
   */
  balance?: PaymentAmount;

  /**
   * The maximum spendable balance for a single transaction. Applicable to some gift cards.
   */
  transactionLimit?: PaymentAmount;
}

export interface Order {
  /** The encrypted order data. */
  orderData: string;

  /** The pspReference that belongs to the order. */
  pspReference: string;

  /** The remaining amount to complete the order. */
  remainingAmount?: PaymentAmount;
}

/**
 * Represents the response structure specifically for session flow.
 */
export type SessionsResult = {
  /**
   * The session ID.
   */
  sessionId: string;
  /**
   * An encoded string that can be used to get the payment outcome on your server.
   * @description Use this value with the new `/sessions/id` endpoint as a query string on your server to get a synchronous result for your payment.
   */
  sessionResult: string;
  /**
   * The primary result code indicating the overall status of the session operation.
   */
  resultCode: ResultCode;
  /**
   * The session data.
   */
  sessionData: string;
};

/**
 * Handler passed to the advanced-flow `onSubmit` callback. Supports the full set
 * of outcomes: forwarding an action, finishing with a result, or letting the
 * shopper retry.
 */
export interface PaymentSubmitResultHandler {
  /**
   * Forward a payment action to the SDK for handling (3DS2, redirect, etc.).
   * @param action - The payment action received from the `/payments` response.
   */
  action(action: PaymentAction): void;

  /**
   * Signal that the payment flow reached a final result.
   * @param resultCode - The result code from the `/payments` or `/payments/details` response
   *                      (e.g. `'Authorised'`, `'Refused'`, `'Error'`).
   */
  completion(resultCode: string): void;

  /**
   * Let the shopper retry the payment, optionally showing a message.
   * @param message - An optional reason shown to the shopper before retry.
   */
  retry(message?: string): void;
}

/**
 * Handler passed to the advanced-flow `onAdditionalDetails` callback. The SDK has
 * already resolved the action, so the merchant only forwards the final result.
 */
export interface PaymentAdditionalResultHandler {
  /**
   * Signal that the payment flow reached a final result.
   * @param resultCode - The result code from the `/payments/details` response.
   */
  completion(resultCode: string): void;
}

/**
 * Handler passed to the session-flow and error callbacks. The SDK owns action and
 * retry handling in these flows, so the merchant only forwards the final result.
 */
export interface PaymentResultHandler {
  /**
   * Signal that the payment flow reached a final result.
   * @param resultCode - The result code from the `/payments` or `/payments/details` response.
   */
  completion(resultCode: string): void;
}

/**
 * Data provided to the `onBeforeSubmit` callback before a session payment is submitted.
 * The consumer can inspect or modify shopper fields before proceeding.
 */
export interface BeforeSubmitData {
  billingAddress?: object;
  deliveryAddress?: object;
  shopperName?: { firstName?: string; lastName?: string };
  shopperEmail?: string;
}

/**
 * Handler passed to the session-flow `onBeforeSubmit` callback.
 * The consumer must call exactly one method to continue the flow.
 */
export interface BeforeSubmitHandler {
  /** Continue with the (optionally modified) data. */
  proceed(data: BeforeSubmitData, sessionData?: string): void;
  /** Abort the payment submission. */
  abort(): void;
}

/**
 * Callbacks for the sessions flow, provided to `setup()`.
 */
export interface SessionCallbacks {
  /** Called when the session flow completes successfully. Terminal — no further action needed. */
  onComplete(result: SessionsResult): void;

  /** Called when the session flow fails. Terminal — no further action needed. */
  onError(error: AdyenError): void;

  /**
   * Optional. Called before a payment is submitted in the session flow.
   * Intermediate — respond via the handler to proceed or abort.
   * @param data - Shopper data that will be submitted.
   * @param handler - Call `handler.proceed(data)` or `handler.abort()`.
   */
  onBeforeSubmit?(data: BeforeSubmitData, handler: BeforeSubmitHandler): void;
}

/**
 * Callbacks for the advanced flow, provided to `setupAdvanced()`.
 */
export interface AdvancedCallbacks {
  /**
   * Called when the shopper submits a payment. Intermediate — respond via the handler.
   * @param data - The payment method data to submit.
   * @param component - Handler supporting action, completion and retry.
   */
  onSubmit(
    data: PaymentMethodData,
    component: PaymentSubmitResultHandler
  ): void;

  /**
   * Called when additional details are needed. Intermediate — respond via the handler.
   * @param data - The additional payment details.
   * @param component - Handler supporting completion only.
   */
  onAdditionalDetails(
    data: PaymentDetailsData,
    component: PaymentAdditionalResultHandler
  ): void;

  /** Called when the advanced flow completes successfully. Terminal — no further action needed. */
  onComplete(result: PaymentResult): void;

  /** Called when the advanced flow fails. Terminal — no further action needed. */
  onError(error: AdyenError): void;
}

/**
 * Describes an Adyen Component capable of handling payment action if specific conditions are met.
 */
export interface ConditionalPaymentComponent {
  isAvailable(
    paymentMethods: PaymentMethod,
    configuration: Configuration
  ): Promise<boolean>;
}
