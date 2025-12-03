import { NativeModules } from 'react-native';
import { MessageBusWrapper } from './MessageBusWrapper';
import { ModuleMock } from '../base/ModuleMock';
import type { AdyenComponent, PaymentAction } from '../../core/types';
import { EventListenerWrapper } from '../base/EventListenerWrapper';

export interface MessageBusModule extends EventListenerWrapper, AdyenComponent {
  /**
   * Handle a payment action received by the component.
   * @param action - The payment action to be handled.
   */
  handle(action: PaymentAction): void;
}

/** Communication bus for all embeded Native Modules. */
export const MessageBus: MessageBusModule = new MessageBusWrapper(
  NativeModules.AdyenMessageBus ?? ModuleMock
);
