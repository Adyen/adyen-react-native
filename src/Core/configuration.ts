import { PaymentAmount } from './types';

/** Collection of available environments. */
type Environment =
  | 'test'
  | 'live-eu'
  | 'live-us'
  | 'live-au'
  | 'live-apse'
  | 'live-in';

/**
 * General type for AdyenContext configuration. See {@link https://github.com/Adyen/adyen-react-native/blob/develop/docs/Configuration.md}
 */
export interface Configuration {
  /** Selected environment */
  environment: Environment;

  /** A public key linked to your web service user, used for {@link https://docs.adyen.com/user-management/client-side-authentication | client-side authentication}. */
  clientKey: string;

  /** Return URL to be called after payment is completed. */
  returnUrl: string;

  /** The shopper's country code. A valid value is an ISO two-character country code (e.g. 'NL'). */
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
  google?: GooglePayConfiguration;
}

export interface DropInConfiguration {
  /**  Determines whether to enable preselected stored payment method view step */
  showPreselectedStoredPaymentMethod?: boolean;

  /** Determines whether to enable skipping payment list step when there is only one non-instant payment method. */
  skipListWhenSinglePaymentMethod?: boolean;
}

/** Collection of values for address field visibility. */
type AddressMode = 'full' | 'postalCode' | 'none';

/** Collection of values for address field visibility. */
type FieldVisibility = 'show' | 'hide';

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
}

export interface ApplePayConfiguration {
  /**  The merchant identifier for apple pay. */
  merchantID: string;
  /** The merchant name.  */
  merchantName: string;
  /** The flag to toggle onboarding. */
  allowOnboarding?: boolean;
}

type CardAuthMethod = 'PAN_ONLY' | 'CRYPTOGRAM_3DS';

type TotalPriceStatus = 'NOT_CURRENTLY_KNOWN' | 'ESTIMATED' | 'FINAL';

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
  /** Set to true if you require a billing address. A billing address should only be requested if it's required to process the transaction. */
  billingAddressRequired?: boolean;
  /** Set to true to request an email address. */
  emailRequired?: boolean;
  /** Set to true to request a full shipping address. */
  shippingAddressRequired?: boolean;
  /** If set to true then the IsReadyToPayResponse object includes an additional paymentMethodPresent property that describes the visitor's readiness to pay with one or more payment methods specified in allowedPaymentMethods. */
  existingPaymentMethodRequired?: boolean;
  /** The environment to be used by GooglePay. Should be either WalletConstants.ENVIRONMENT_TEST or WalletConstants.ENVIRONMENT_PRODUCTION. By default is using environment from root. */
  googlePayEnvironment?: string;
}
