import { AdyenComponent } from '../core/AdyenNativeModules';
import { ComponentWrapper } from './ComponentWrapper';
import { Order, Balance, PaymentMethodData } from '../core/types';

export interface PartialPaymentListener {
  checkBalance(data: PaymentMethodData, component: PartialPaymentComponent): void;
  requestOrder(component: PartialPaymentComponent): void;
  cancelOrder(order: Order): void;
}

export interface PartialPaymentComponent {
  provideBalance(success: boolean, balance: Balance | undefined, error: Error | undefined): void;
  provideOrder(success: boolean, order: Order | undefined, error: Error | undefined): void;
}

export function isPartialPaymentsComponent(
  object: AdyenComponent
): object is ComponentWrapper {
  return 'provideBalance' in object && 'provideOrder' in object;
}
