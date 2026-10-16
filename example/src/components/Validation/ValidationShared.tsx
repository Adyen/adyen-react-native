//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { Text } from 'react-native';
import type { Checkout, Controller } from '@adyen/react-native';

export function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'error';
}

export function cardController(checkout: Checkout): Promise<Controller> {
  const card = checkout.paymentMethods.regular.first(
    (paymentMethod) => paymentMethod.type === 'scheme'
  );
  if (!card) {
    return Promise.reject(
      Object.assign(new Error('No card payment method'), {
        code: 'invalidTarget',
      })
    );
  }
  return checkout.createController(card);
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Publishes a route state through the `validation-status-<value>` accessibility label. */
export const Status = ({ value }: { value: string }) => (
  <Text
    testID="validation-status"
    accessibilityLabel={`validation-status-${value}`}
  >
    {value}
  </Text>
);
