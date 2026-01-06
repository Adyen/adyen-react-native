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
