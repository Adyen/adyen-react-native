/**
 * Find payment method in JSON response or \paymentMethods API
 */

import type { PaymentMethodsResponse } from '../../core/types';

export function find(paymentMethods: PaymentMethodsResponse, typeName: string) {
  return paymentMethods.paymentMethods.find(
    (pm) => pm.type === mapCreatedComponentType(typeName)
  );
}

/**
 * Map component name to txVariable name from \paymentMethod response
 * @param {string} pmType
 * @returns {string} matching txVariable name or original name
 */
function mapCreatedComponentType(pmType: string) {
  // Components created as 'card' need to be matched with paymentMethod response objects with type 'scheme'
  return pmType === 'card' ? 'scheme' : pmType;
}
