import { NativeModules } from 'react-native';
import { MessageBusWrapper } from './MessageBusWrapper';
import { ModuleMock } from '../base/ModuleMock';
import { EventListenerWrapper } from '../base/EventListenerWrapper';

export interface MessageBusModule extends EventListenerWrapper {
  subscribe(componentId: String): void;
  unsubscribe(componentId: String): void;
}

/**Encryption helper. */
export const AdyenMessageBus: MessageBusModule = new MessageBusWrapper(
  NativeModules.AdyenMessageBus ?? ModuleMock
);
