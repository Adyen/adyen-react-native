import type { PaymentMethodsResponse } from '../../core';
import { type BaseNativeModule, ModuleWrapper } from './ModuleWrapper';

export interface PaymentModule extends BaseNativeModule {
  open(paymentMethods: PaymentMethodsResponse): void;
}

/**
 * Wrapper for payment components that can open a payment flow.
 */
export abstract class PaymentComponentWrapper<
  T extends PaymentModule = PaymentModule,
> extends ModuleWrapper<T> {
  open(paymentMethods: PaymentMethodsResponse) {
    this.nativeModule.open(paymentMethods);
  }
}
