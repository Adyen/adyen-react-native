import type { StoredCardPaymentMethod } from '../../../api/types';

export function storedSubtitle(
  paymentMethod: StoredCardPaymentMethod
): string | undefined {
  switch (paymentMethod.type) {
    case 'scheme':
      return `exp ${paymentMethod.expiryMonth}/${paymentMethod.expiryYear}`;
    default:
      return undefined;
  }
}
