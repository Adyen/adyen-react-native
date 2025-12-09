import { type NativeModule } from 'react-native';
import { Event } from '../../core/constants';
import { EventListenerWrapper } from '../base/EventListenerWrapper';
import type { MessageBusModule } from './MessageBusModule';
import type { HideOption, PaymentAction } from '../../core/types';

/**
 *  Communication bus for all embeded Native Modules.
 * */
export class MessageBusWrapper
  extends EventListenerWrapper
  implements MessageBusModule
{
  name: string = 'MessageBus';

  constructor(nativeModule: NativeModule) {
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
