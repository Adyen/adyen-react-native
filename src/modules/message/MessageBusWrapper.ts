import { type NativeModule } from 'react-native';
import { Event } from '../../core/constants';
import { EventListenerWrapper } from '../base/EventListenerWrapper';
import type { MessageBusModule } from './MessageBusModule';

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
      Event.onBinLookuop,
      Event.onCancelOrder,
      Event.onRequestOrder,
      Event.onCheckBalance,
      Event.onDisableStoredPaymentMethod,
      Event.onAddressConfirm,
      Event.onAddressUpdate,
    ]);
  }
  unsubscribe(componentId: String): void {
    this.nativeModule.unsubscribe(componentId);
  }
  subscribe(componentId: String) {
    this.nativeModule.subscribe(componentId);
  }
}
