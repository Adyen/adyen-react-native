import { AddressLookup, AddressLookupItem } from './AddressLookup';

export interface BinLookupData {
  brand: string;
}
export interface CardsConfiguration {
  /**
   * Determines whether the field for the cardholder's name is required.
   * @default false
   */
  holderNameRequired?: boolean;
  /**
   * Indicates the display mode of the billing address form.
   * @possibleValues "none", "postal", "full"
   * - "none": Billing address form is not displayed.
   * - "postal": Only postal code field is displayed.
   * - "full": Full billing address form is displayed.
   * - "lookup": Address lookup mode that provide dynamic UI and allow address validation via `onUpdateAddress` and `onConfirmAddress` callbacks.
   * @default "none"
   */
  addressVisibility?: AddressMode;
  /** IIndicates if the toggle allowing the user to store the card payment
   * method for future use should be displayed in the form.
   * @default true */
  showStorePaymentField?: boolean;
  /**
   * Indicates whether to hide the Card Verification Code (CVC) input field when the user is paying with a stored card.
   * @default false
   */
  hideCvcStoredCard?: boolean;
  /**
   * Indicates whether to hide the Card Verification Code (CVC) input field when the user is entering a new card details.
   * @default false
   */
  hideCvc?: boolean;
  /**
   * Indicates the visibility mode for the security fields specific to South Korea issued cards.
   * @possibleValues "show", "hide"
   * @default "hide"
   */
  kcpVisibility?: FieldVisibility;
  /**
   * Indicates the visibility mode for the social security number field
   * (CPF/CNPJ) for Brazilian issued cards.
   * @possibleValues "show", "hide"
   * @default "hide"
   */
  socialSecurity?: FieldVisibility;
  /**
   * An optional list of allowed card types (e.g., "visa", "mastercard", "amex").
   * If provided, only these card types will be accepted.
   * If not provided, the component will attempt to use the list of supported
   * brands from the \paymentMethod response. If that's also not available,
   * it will fallback to a list of all known card types.
   */
  supported?: string[];
  /**
   * An optional list of ISO 3166-1 alpha-2 country codes (e.g., "US", "GB", "BR").
   * If provided, the billing address form will only allow selection of these countries.
   */
  allowedAddressCountryCodes?: string[];
  /**
   * An optional callback that is triggered when a new prompt for delegated address lookup requested.
   * @param {string} prompt - The address query string entered by the user.
   * @param {AddressLookup} lookup - The `AddressLookup` object that provides methods
   * to update, confirm, or reject address lookup results.
   */
  onUpdateAddress?(prompt: string, lookup: AddressLookup): void;
  /**
   * An optional callback when a new address for delegated address lookup confirmed.
   * @param {AddressLookupItem} address - The address item that the user has selected on UI.
   * @param {AddressLookup} lookup - The `AddressLookup` object. While an address is confirmed,
   * it might be used for further actions or state updates.
   */
  onConfirmAddress?(address: AddressLookupItem, lookup: AddressLookup): void;
  /**
   * An optional callback that is triggered when the BIN lookup data is available.
   * @param {BinLookupData[]} data - An array of Bank Identification Number (BIN) lookup results.
   */
  onBinLookup?(data: BinLookupData[]): void;
  /**
   * An optional callback that is triggered when the BIN (first 6 or 8 PAN digits) typed by the shopper in the PAN field in `CardComponent` changes.
   * @param binValue - The Bank Identification Number (BIN) value.
   */
  onBinValue?(binValue: String): void;
}

/** Collection of values for address field visibility. */
export type AddressMode = 'full' | 'postalCode' | 'none' | 'lookup';

/** Collection of values for address field visibility. */
export type FieldVisibility = 'show' | 'hide';
