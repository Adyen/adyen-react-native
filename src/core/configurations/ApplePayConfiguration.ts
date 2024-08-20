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
export type ApplePayShippingType = 'shipping' |
  'delivery' |
  'storePickup' |
  'servicePickup';

/** Collection of values for address field visibility. */
export type ApplePayAddressFields = 'postalAddress' |
  'name' |
  'phoneticName' |
  'phone' |
  'email';

/** An object that defines a summary item in a payment request—for example, total, tax, discount, or grand total. */
export interface ApplePaySummaryItem {
  /** A short, localized description of the summary item. */
  label: string;
  /** The amount associated with the summary item. */
  amount: Number | string;
  /** The summary item’s type that indicates whether the amount is final. */
  type?: 'pending' | 'final';
}

export interface ApplePayShippingMethod extends ApplePaySummaryItem {
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

/** An object that represents a request to set up a recurring payment, typically a subscription. */
export interface ApplePayRecurringPaymentRequest {
  /** A description of the recurring payment, for example "Apple News+". */
  description: string;
  /** The regular billing cycle, for example "$9.99 monthly". */
  regularBilling: ApplePayRecurringSummaryItem;
  /** A URL that links to a page on your web site where the user can manage the payment method for this recurring payment, including deleting it. */
  managementURL: string;
  /** Optional, trial billing cycle, for example "$1.99 for the first six months". */
  trialBilling?: ApplePayRecurringSummaryItem;
  /** Optional, localized billing agreement to be displayed to the user prior to payment authorization. */
  billingAgreement?: string;
  /** Optional URL to receive lifecycle notifications for the merchant-specific payment token issued for this request, if applicable. If this property is not set, notifications will not be sent when lifecycle changes occur for the token, for example when the token is deleted. */
  tokenNotificationURL?: string;
};

/** An object that defines a summary item for a payment that occurs repeatedly at a specified interval, such as a subscription. */
export interface  ApplePayRecurringSummaryItem extends ApplePaySummaryItem  {
  /** The timestamp at which the first payment will be taken; nil indicates immediately. The default value is nil. */
  startDate?: Date;
  /** The interval at which payments will be taken (daily, weekly, monthly, yearly, etc.). The default value is NSCalendarUnitMonth. */
  intervalUnit?: ApplePayCalendarUnit;
  /** The number of intervals between payments. Default is 1. */
  intervalCount?: Number;
  /** If set, the date at which the recurring payments will end. Default is nil. */
  endDate: Date;
};

/** A type that indicates calendrical units, such as year, month, day, and hour. */
export type ApplePayCalendarUnit = `year` | `month` | `day` | `hour` | `minute`;