import { useRef } from 'react';
import { type EmitterSubscription } from 'react-native';
import { EmbeddedComponentBus } from '../modules/embeded/EmbeddedComponentBus';
import { startEventListeners, type EventHandlerRefs } from '../components/startEventListeners';
import type { AdyenComponentContextType } from './useComponent';
import type {
  EventListenerWrapper,
  NativeModuleWithConstants,
} from '../modules/base/EventListenerWrapper';

export type ComponentSubscriptionManager = AdyenComponentContextType & {
  removeEventListeners: <T extends NativeModuleWithConstants>(
    nativeComponent: EventListenerWrapper<T>
  ) => void;
  storeEventListeners: <T extends NativeModuleWithConstants>(
    nativeComponent: EventListenerWrapper<T>,
    listeners: EmitterSubscription[]
  ) => void;
  cleanup: () => void;
};

export function useSubscriptionManager(
  eventHandlerRefs: EventHandlerRefs
): ComponentSubscriptionManager {
  const subscriptions = useRef<Map<string, EmitterSubscription[]>>(new Map());
  const isSubscribed = useRef(false);

  function removeEventListeners<T extends NativeModuleWithConstants>(
    nativeComponent: EventListenerWrapper<T>
  ) {
    const listeners = subscriptions.current.get(nativeComponent.name) ?? [];
    listeners.forEach((s: EmitterSubscription) => s.remove());
    subscriptions.current.delete(nativeComponent.name);
  }

  function storeEventListeners<T extends NativeModuleWithConstants>(
    nativeComponent: EventListenerWrapper<T>,
    listeners: EmitterSubscription[]
  ) {
    subscriptions.current.set(nativeComponent.name, listeners);
  }

  function subscribe(_componentType: string) {
    if (!isSubscribed.current) {
      isSubscribed.current = true;
      const bag = startEventListeners(EmbeddedComponentBus, eventHandlerRefs);
      storeEventListeners(EmbeddedComponentBus, bag);
    }
  }

  function unsubscribe(_componentType: string) {
    isSubscribed.current = false;
    removeEventListeners(EmbeddedComponentBus);
  }

  function cleanup() {
    subscriptions.current.forEach((module) =>
      module.forEach((s) => s.remove())
    );
    subscriptions.current.clear();
  }

  return { subscribe, unsubscribe, removeEventListeners, storeEventListeners, cleanup };
}
