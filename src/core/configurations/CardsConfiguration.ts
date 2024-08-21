import { AddressLookup, AddressLookupItem } from './AddressLookup';

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
  /**
   * Callback when a new prompt for delegated address lookup requested.
   * @param address Object with latest address information
   */
  onUpdateAddress?(prompt: string, lookup: AddressLookup): void;
  /**
   * Callback when a new address for delegated address lookup confirmed.
   * @param address
   */
  onConfirmAddress?(address: AddressLookupItem, lookup: AddressLookup): void;
}

/** Collection of values for address field visibility. */
export type AddressMode = 'full' | 'postalCode' | 'none' | 'lookup';

/** Collection of values for address field visibility. */
export type FieldVisibility = 'show' | 'hide';


