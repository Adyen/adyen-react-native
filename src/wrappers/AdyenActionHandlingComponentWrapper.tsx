import { ErrorCode } from "../core/constants";
import { PaymentAction } from "../core/types";
import { AdyenNativeComponentWrapper } from "./AdyenNativeComponentWrapper";
import { AdyenActionComponent, AdyenComponent } from "../core/AdyenNativeModules";

/**
 *  Wrapper for all Native Modules that do not support Action handling.
 * */
export class AdyenActionHandlingComponentWrapper extends AdyenNativeComponentWrapper {
  handle(action: PaymentAction) {
    if (this.canHandleAction) {
      this.nativeModule.handle(action);
    } else {
      throw Error(ErrorCode.notSupportedAction);
    }
  }
}

export function isActionComponent(object: AdyenComponent): object is AdyenActionComponent {
  return 'handle' in object;
}