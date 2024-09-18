export interface GooglePayConfiguration {
  /**  The merchant account to be put in the payment token from Google to Adyen. By default uses value from brands. */
  merchantAccount?: string;
  /** One or more card networks that you support, also supported by the Google Pay API. */
  allowedCardNetworks?: string[];
  /** Fields supported to authenticate a card transaction. */
  allowedAuthMethods?: CardAuthMethod[];
  /** The status of the total price used. Defaults to "FINAL". */
  totalPriceStatus?: TotalPriceStatus;
  /** Set to false if you don't support prepaid cards. Default: The prepaid card class is supported for the card networks specified. */
  allowPrepaidCards?: boolean;
  /** Set to false if you don't support credit cards. Default: The credit card class is supported for the card networks specified. */
  allowCreditCards?: boolean;
  /** Set to true if you require a billing address. A billing address should only be requested if it's required to process the transaction. */
  billingAddressRequired?: boolean;
  /** The expected fields returned if billingAddressRequired is set to true. */
  billingAddressParameters?: GooglePayBillingAddressParameters;
  /** Set to true to request an email address. */
  emailRequired?: boolean;
  /** Set to true to request a full shipping address. */
  shippingAddressRequired?: boolean;
  /** The expected fields returned if shippingAddressRequired is set to true. */
  shippingAddressParameters?: GooglePayShippingAddressParameters;
  /** If set to true then the IsReadyToPayResponse object includes an additional paymentMethodPresent property that describes the visitor's readiness to pay with one or more payment methods specified in allowedPaymentMethods. */
  existingPaymentMethodRequired?: boolean;
  /** The environment to be used by GooglePay. Should be either WalletConstants.ENVIRONMENT_TEST (3) or WalletConstants.ENVIRONMENT_PRODUCTION (1). By default is using environment from root. */
  googlePayEnvironment?: GooglePayEnvironment;
}

/** An object that defines a summary item in a payment request—for example, total, tax, discount, or grand total. */
export interface GooglePayShippingAddressParameters {
  /** ISO 3166-1 alpha-2 country code values of the countries where shipping is allowed. If this object isn't specified, all shipping address countries are allowed. */
  allowedCountryCodes?: string[];
  /** Set to true if a phone number is required for the provided shipping address. */
  phoneNumberRequired?: boolean;
}

/** An object that defines a summary item in a payment request—for example, total, tax, discount, or grand total. */
export interface GooglePayBillingAddressParameters {
  /** Billing address format required to complete the transaction.
   *
   * MIN: Name, country code, and postal code (default).
   * FULL: Name, street address, locality, region, country code, and postal code.
   */
  format?: GooglePayBillingAddressFormat;
  /** Set to true if a phone number is required for the provided shipping address. */
  phoneNumberRequired?: boolean;
}

export type GooglePayBillingAddressFormat = 'MIN' | 'FULL';

export type TotalPriceStatus = 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';

export type CardAuthMethod = 'PAN_ONLY' | 'CRYPTOGRAM_3DS';

export enum GooglePayEnvironment {
  Test = 3,
  Production = 1,
}
