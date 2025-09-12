import type { PaymentMethod } from '@adyen/react-native';

export function icon(paymentMethod: PaymentMethod) {
  return paymentMethod.type === 'scheme' ? 'card' : paymentMethod.type;
}
