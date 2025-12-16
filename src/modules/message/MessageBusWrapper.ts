import type { NativeModule } from 'react-native';
import { Event } from '../../core/constants';
import { EventListenerWrapper } from '../base/EventListenerWrapper';
import type { MessageBusModule } from './MessageBusModule';
import type { HideOption, PaymentAction } from '../../core/types';

/** Native module interface specific to MessageBus */
export interface MessageBusNativeModule extends NativeModule {
  hide(success: boolean, option?: HideOption): void;
  handle(action: PaymentAction): void;
}

/**
 *  Communication bus for all embedded Native Modules.
 * */
export class MessageBusWrapper
  extends EventListenerWrapper<MessageBusNativeModule>
  implements MessageBusModule
{
  name: string = 'MessageBus';

  constructor(nativeModule: MessageBusNativeModule) {
    super(nativeModule, [
      Event.onError,
      Event.onComplete,
      Event.onSubmit,
      Event.onAdditionalDetails,
      Event.onBinValue,
      Event.onBinLookup,
      Event.onAddressConfirm,
      Event.onAddressUpdate,
    ]);
  }
  hide(success: boolean, option?: HideOption): void {
    if (option?.message) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
  }
  handle(action: PaymentAction): void {
    this.nativeModule.handle(action);
  }
}
