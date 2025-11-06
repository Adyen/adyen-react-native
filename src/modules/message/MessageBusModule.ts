import { NativeModules } from 'react-native';
import { MessageBusWrapper } from './MessageBusWrapper';
import { ModuleMock } from '../base/ModuleMock';
import { EventListenerWrapper } from '../base/EventListenerWrapper';

export interface MessageBusModule extends EventListenerWrapper {
  subscribe(componentId: String): void;
  unsubscribe(componentId: String): void;
}

/** Communication bus for all embeded Native Modules. */
export const MessageBus: MessageBusModule = new MessageBusWrapper(
  NativeModules.AdyenMessageBus ?? ModuleMock
);
