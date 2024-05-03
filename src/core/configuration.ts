import {PaymentAmount} from './types';

/** Collection of available environments. */
export type Environment =
  | 'test'
  | 'live-eu'
  | 'live-us'
  | 'live-au'
  | 'live-apse'
  | 'live-in';

export interface BaseConfiguration {
  /** Configuration for analytics service */
  analytics?: AnalyticsOptions;
  /** Selected environment */
  environment: Environment;
  /** A public key linked to your web service user, used for {@link https://docs.adyen.com/user-management/client-side-authentication | client-side authentication}. */
  clientKey: string;
  /**
  * The shopper's locale. This is used to enforce the language rendered in the UI.
  * If no value is set, will rely on the system to choose the best fitting locale based on the device's locale and locales supported by the app.
  * Fallback locale is 'en-US'.
  * @defaultValue null.
  */
  locale?: string;
}

export interface AnalyticsOptions {
  /** Enable/Disable all telemetry. */
  enabled?: boolean;
  /** Enable/Disable verbose logs printed in the IDE developer console. */
  verboseLogs?: boolean;
}

/**
 * General type for AdyenContext configuration. See {@link https://github.com/Adyen/adyen-react-native/blob/develop/docs/Configuration.md}
 */
export interface Configuration extends BaseConfiguration {
  /** Return URL to be called after payment is completed. This value is always passed throught on iOS and in some cases overrided on Android. */
  returnUrl: string;
  /** The shopper's country code. A valid value is an ISO two-character country code (e.g. 'NL'). Required for iOS to visualize the amount. */
  countryCode?: string;
  /** Amount to be displayed on the Pay Button. */
  amount?: PaymentAmount;
  /** Drop-In configuration. */
  dropin?: DropInConfiguration;
  /** Card component configuration. */
  card?: CardsConfiguration;
  /** Apple Pay component configuration. */
  applepay?: ApplePayConfiguration;
  /** Google Pay component configuration. */
  googlepay?: GooglePayConfiguration;
}

export interface DropInConfiguration {
  /**  Determines whether to enable preselected stored payment method view step */
  showPreselectedStoredPaymentMethod?: boolean;
  /** Determines whether to enable skipping payment list step when there is only one non-instant payment method. */
  skipListWhenSinglePaymentMethod?: boolean;
  /** Set custom title for preselected stored payment method view Drop-in on iOS. By default app's name used. This property have no effect on Android. */
  title?: string;
}

/** Collection of values for address field visibility. */
export type AddressMode = 'full' | 'postalCode' | 'none';

/** Collection of values for address field visibility. */
export type FieldVisibility = 'show' | 'hide';

export interface CardsConfiguration {
  /**  Determines whether to enable preselected stored payment method view step */
  holderNameRequired?: boolean;
  /** Indicates the display mode of the billing address form. Options: "none", "postal", "full". Defaults to "none". */
  addressVisibility?: AddressMode;
  /** Indicates if the field for storing the card payment method should be displayed in the form. Defaults to true. */
  showStorePaymentField?: boolean;
  /** Indicates whether to show the security code field on a stored card payment. Defaults to false. */
  hideCvcStoredCard?: boolean;
  /** Indicates whether to show the security code field at all. Defaults to false. */
  hideCvc?: boolean;
  /** Indicates whether to show the security fields for South Korea issued cards. Options: "show" or "hide". Defaults to "hide". */
  kcpVisibility?: FieldVisibility;
  /** Indicates the visibility mode for the social security number field (CPF/CNPJ) for Brazilian cards. Options: "show" or "hide". Defaults to "hide". */
  socialSecurity?: FieldVisibility;
  /** The list of allowed card types. By default uses list of brands from payment method. Fallbacks to list of all known cards. */
  supported?: string[];
  /** List of ISO 3166-1 alpha-2 country code values. */
  allowedAddressCountryCodes?: string[];
}

export interface ApplePayConfiguration {
  /**  The merchant identifier for apple pay. */
  merchantID: string;
  /** The merchant name. This value will be used to generate a single *PKPaymentSummaryItem* if `summaryItems` is not provided. */
  merchantName?: string;
  /** The flag to toggle onboarding. */
  allowOnboarding?: boolean;
  /** The line items for this payment. The last element of this array must contain the same value as `amount` on the Checkout `\payments` API request. **WARNING**: Adyen uses integer minor units, whereas Apple uses `NSDecimalNumber`. */
  summaryItems?: ApplePaySummaryItem[];
  /** A list of fields that you need for a shipping contact in order to process the transaction. The list is empty by default. */
  requiredShippingContactFields?: ApplePayAddressFields[];
  /** A list of fields that you need for a billing contact in order to process the transaction. The list is empty by default. */
  requiredBillingContactFields?: ApplePayAddressFields[];
  /** Billing contact information for the user. */
  billingContact?: ApplePayPaymentContact;
  /** Shipping contact information for the user. */
  shippingContact?: ApplePayPaymentContact;
  /** An optional value that indicates how to ship purchased items. The default value is shipping. */
  shippingType?: ApplePayShippingType;
  /** A list of two-letter country codes for limiting payment to cards from specific countries or regions. */
  supportedCountries?: string[];
  /** The list of shipping methods available for a payment request. */
  shippingMethods?: ApplePayShippingMethod[];
}

/** Collection of values for address field visibility. */
export type ApplePayShippingType =
  | 'shipping'
  | 'delivery'
  | 'storePickup'
  | 'servicePickup';

/** Collection of values for address field visibility. */
export type ApplePayAddressFields =
  | 'postalAddress'
  | 'name'
  | 'phoneticName'
  | 'phone'
  | 'email';

/** An object that defines a summary item in a payment request—for example, total, tax, discount, or grand total. */
export interface ApplePaySummaryItem {
  /** A short, localized description of the summary item. */
  label: string;
  /** The amount associated with the summary item. */
  amount: Number | string;
  /** The summary item’s type that indicates whether the amount is final. */
  type?: 'pending' | 'final';
}

export interface ApplePayShippingMethod {
  /** A short, localized description of the summary item. */
  label: string;
  /** The amount associated with the summary item. */
  amount: Number | string;
  /** The summary item’s type that indicates whether the amount is final. */
  type?: 'pending' | 'final';
  /** A client-defined value used to identify this shipping method. */
  identifier?: string;
  /** Additional description of the shipping method. */
  detail?: string;
  /** The start date of expected delivery range in ISO 8601 date format (ex. 2025-04-21). */
  startDate?: string;
  /** The end date of expected delivery range in ISO 8601 date format (ex. 2025-04-21). */
  endDate?: string;
}

/** An object that defines a summary item in a payment request—for example, total, tax, discount, or grand total. */
export interface ApplePayPaymentContact {
  /** A phone number for the contact. */
  phoneNumber?: string;
  /** An email address for the contact. */
  emailAddress?: string;
  /** The contact’s given name. */
  givenName?: string;
  /** The contact’s family name. */
  familyName?: string;
  /** The phonetic spelling of the contact’s given name. */
  phoneticGivenName?: string;
  /** The phonetic spelling of the contact’s family name. */
  phoneticFamilyName?: string;
  /** The street portion of the address for the contact. */
  addressLines?: string[];
  /** Additional information associated with the location, typically defined at the city or town level (such as district or neighborhood), in a postal address. */
  subLocality?: string;
  /** The city for the contact. */
  locality?: string;
  /** The zip code or postal code, where applicable, for the contact. */
  postalCode?: string;
  /** The zip code or postal code, where applicable, for the contact. */
  subAdministrativeArea?: string;
  /** The subadministrative area (such as a county or other region) in a postal address. */
  administrativeArea?: string;
  /** The state for the contact. */
  country?: string;
  /** The contact’s two-letter ISO 3166 country code. */
  countryCode?: string;
}

export type CardAuthMethod = 'PAN_ONLY' | 'CRYPTOGRAM_3DS';

export type TotalPriceStatus = 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';

export enum GooglePayEnvironment {
  Test = 3,
  Production = 1,
}

export type GooglePayBillingAddressFormat = 'MIN' | 'FULL';

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

/** An object that defines a summary item in a payment request—for example, total, tax, discount, or grand total. */
export interface GooglePayShippingAddressParameters {
  /** ISO 3166-1 alpha-2 country code values of the countries where shipping is allowed. If this object isn't specified, all shipping address countries are allowed. */
  allowedCountryCodes?: string[];
  /** Set to true if a phone number is required for the provided shipping address. */
  phoneNumberRequired?: boolean;
}

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
