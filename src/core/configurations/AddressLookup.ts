export interface AddressLookup {
  update(results: AddressLookupItem[]): void;
  confirm(address: AddressLookupItem): void;
  reject(error?: { message: string }): void;
}

export interface PostalAddress {
  /** The house number or extra house information. */
  houseNumberOrName?: string;
  /** Additional information associated with the location, typically defined at the city or town level (such as district or neighborhood), in a postal address. */
  stateOrProvince?: string;
  /** The city for the contact. */
  city?: string;
  /** The zip code or postal code, where applicable, for the contact. */
  postalCode?: string;
  /** The subadministrative area (such as a county or other region) in a postal address. */
  street?: string;
  /** The state for the contact. */
  country?: string;
}

export interface AddressLookupItem {
  /** The postal address information. */
  address: PostalAddress;
  /** The unique identifier of postal address */
  id: string;
}
