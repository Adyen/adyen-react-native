import { NativeModules } from 'react-native';
import { MessageBusWrapper } from './MessageBusWrapper';
import { ModuleMock } from '../base/ModuleMock';
import type { AdyenComponent, PaymentAction } from '../../core/types';
import type { EventListenerWrapper } from '../base/EventListenerWrapper';

export interface MessageBusModule extends AdyenComponent, EventListenerWrapper {
  /**
   * Handle a payment action received by the component.
   * @param action - The payment action to be handled.
   * @param name - The name of the component handling the action.
   */
  handle(action: PaymentAction, name: string): void;
}

/** Communication bus for all embedded Native Modules. */
export const MessageBus: MessageBusModule = new MessageBusWrapper(
  NativeModules.AdyenMessageBus ?? ModuleMock
);
