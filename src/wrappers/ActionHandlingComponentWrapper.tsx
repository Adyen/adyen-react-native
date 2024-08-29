import { PaymentAction } from '../core/types';
import { ComponentWrapper } from './ComponentWrapper';
import {
  AdyenActionComponent,
  AdyenComponent,
} from '../core/AdyenNativeModules';

/**
 *  Wrapper for all Native Modules that support Action handling.
 * */
export class ActionHandlingComponentWrapper
  extends ComponentWrapper
  implements AdyenActionComponent
{
  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}

export function isActionComponent(
  object: AdyenComponent
): object is ActionHandlingComponentWrapper {
  return 'handle' in object;
}
