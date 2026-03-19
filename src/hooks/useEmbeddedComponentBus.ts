import { useCallback, useEffect, useRef } from 'react';
import { type EmitterSubscription } from 'react-native';
import { EmbeddedComponentBus } from '../modules/embedded/EmbeddedComponentBus';
import { EmbeddedComponentProxy } from '../modules/embedded/EmbeddedComponentProxy';
import {
  startEventListeners,
  type EventHandlerRefs,
} from '../components/startEventListeners';
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
};

export function useSubscriptionManager(
  eventHandlerRefs: EventHandlerRefs
): ComponentSubscriptionManager {
  const subscriptions = useRef<Map<string, EmitterSubscription[]>>(new Map());

  const removeEventListeners = useCallback(
    <T extends NativeModuleWithConstants>(
      nativeComponent: EventListenerWrapper<T>
    ) => {
      const listeners = subscriptions.current.get(nativeComponent.name) ?? [];
      listeners.forEach((s: EmitterSubscription) => s.remove());
      subscriptions.current.delete(nativeComponent.name);
    },
    []
  );

  const storeEventListeners = useCallback(
    <T extends NativeModuleWithConstants>(
      nativeComponent: EventListenerWrapper<T>,
      listeners: EmitterSubscription[]
    ) => {
      subscriptions.current.set(nativeComponent.name, listeners);
    },
    []
  );

  const subscribe = useCallback(
    (componentType: string) => {
      if (subscriptions.current.has(componentType)) return;
      EmbeddedComponentBus.subscribe(componentType);
      const proxy = new EmbeddedComponentProxy(
        EmbeddedComponentBus,
        componentType
      );
      const bag = startEventListeners(proxy, eventHandlerRefs, componentType);
      subscriptions.current.set(componentType, bag);
    },
    [eventHandlerRefs]
  );

  const unsubscribe = useCallback((componentType: string) => {
    const bag = subscriptions.current.get(componentType);
    bag?.forEach((s) => s.remove());
    subscriptions.current.delete(componentType);
    EmbeddedComponentBus.unsubscribe(componentType);
  }, []);

  function cleanup() {
    subscriptions.current.forEach((listeners, componentType) => {
      listeners.forEach((s) => s.remove());
      EmbeddedComponentBus.unsubscribe(componentType);
    });
    subscriptions.current.clear();
  }

  useEffect(() => cleanup, []);

  return {
    subscribe,
    unsubscribe,
    removeEventListeners,
    storeEventListeners,
  };
}
