import type { PaymentMethodsResponse, Configuration } from '../../core';
import { Event } from '../../core';
import { type BaseNativeModule, ModuleWrapper } from './ModuleWrapper';

export interface PaymentModule extends BaseNativeModule {
  open(
    paymentMethods: PaymentMethodsResponse,
    configuration: Configuration
  ): void;
}

export abstract class PaymentComponentWrapper<
  T extends PaymentModule = PaymentModule,
> extends ModuleWrapper<T> {
  constructor(nativeModule: T, events: Event[]) {
    const allEvents = [Event.onSubmit];
    events?.forEach((element: Event) => allEvents.push(element));
    super(nativeModule, allEvents);
  }
  open(paymentMethods: PaymentMethodsResponse, configuration: Configuration) {
    this.nativeModule.open(paymentMethods, configuration);
  }
}
