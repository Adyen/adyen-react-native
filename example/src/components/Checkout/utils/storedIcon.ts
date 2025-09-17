import type { StoredCardPaymentMethod } from '../../../api/types';

export function storedIcon(paymentMethod: StoredCardPaymentMethod): string {
  switch (paymentMethod.type) {
    case 'scheme':
      return `${paymentMethod.brand ?? 'card'}`;
    default:
      return `${paymentMethod.type}`;
  }
}
