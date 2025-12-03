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
      Event.onSubmit,
      Event.onComplete,
      Event.onAdditionalDetails,
      Event.onBinValue,
      Event.onBinLookup,
      Event.onCancelOrder,
      Event.onRequestOrder,
      Event.onCheckBalance,
      Event.onDisableStoredPaymentMethod,
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
  handle(action: PaymentAction) {
    this.nativeModule.handle(action);
  }
}
