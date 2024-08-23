import { AdyenComponent } from '../core/AdyenNativeModules';

export interface RemovesStoredPayment {
  removeStored(success: boolean): void;
}

export function isRemovesStoredPaymentComponent(
  object: AdyenComponent
): object is AdyenComponent {
  return 'removeStored' in object;
}
