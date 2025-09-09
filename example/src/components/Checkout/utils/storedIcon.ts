import type { StoredCardPaymentMethod } from '../../../api/types';

export function storedIcon(pm: StoredCardPaymentMethod): string {
  switch (pm.type) {
    case 'scheme':
      return `${pm.brand ?? 'card'}`;
    default:
      return `${pm.type}`;
  }
}
