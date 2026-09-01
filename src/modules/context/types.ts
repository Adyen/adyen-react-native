import type { PaymentMethodsResponse } from '../../core';

/** @internal Session context */
export interface SessionContext {
  paymentMethods: PaymentMethodsResponse;
  [key: string]: any;
}
