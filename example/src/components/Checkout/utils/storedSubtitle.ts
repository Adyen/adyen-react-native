import type { StoredCardPaymentMethod } from '../../../api/types';

export function storedSubtitle(
  pm: StoredCardPaymentMethod
): string | undefined {
  switch (pm.type) {
    case 'scheme':
      return `exp ${pm.expiryMonth}/${pm.expiryYear}`;
    default:
      return undefined;
  }
}
