import type { StoredCardPaymentMethod } from '../../../api/types';

export function storedTitle(paymentMethod: StoredCardPaymentMethod): string {
  switch (paymentMethod.type) {
    case 'scheme':
      return `**** **** **** ${paymentMethod.lastFour}`;
    default:
      return `${paymentMethod.name}`;
  }
}
