import type { StoredCardPaymentMethod } from '../../../api/types';

export function storedTitle(pm: StoredCardPaymentMethod): string {
  switch (pm.type) {
    case 'scheme':
      return `**** **** **** ${pm.lastFour}`;
    default:
      return `${pm.name}`;
  }
}
