import type { Configuration, PaymentMethodsResponse } from '../../core';
import { type BaseNativeModule, ModuleWrapper } from './ModuleWrapper';

export interface PaymentModule extends BaseNativeModule {
  open(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration
  ): void;
}

/**
 * Wrapper for payment components that can open a payment flow.
 */
export abstract class PaymentComponentWrapper<
  T extends PaymentModule = PaymentModule,
> extends ModuleWrapper<T> {
  open(paymentMethods: PaymentMethodsResponse, configuration: Configuration) {
    this.nativeModule.open(paymentMethods, configuration);
  }
}
