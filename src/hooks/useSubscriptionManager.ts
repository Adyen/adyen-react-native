import { useCallback, useEffect, useRef } from 'react';
import { type EmitterSubscription } from 'react-native';
import { EmbeddedComponentBus } from '../modules/embedded/EmbeddedComponentBus';
import { EmbeddedComponentProxy } from '../modules/embedded/EmbeddedComponentProxy';
import {
  startEventListeners,
  type EventHandlerRefs,
} from '../components/utils/startEventListeners';
import type { AdyenComponentContextType } from './useComponent';
import type {
  EventListenerWrapper,
  NativeModuleWithConstants,
} from '../modules/base/EventListenerWrapper';

type ComponentSubscriptionManager = AdyenComponentContextType & {
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
    (viewId: string) => {
      if (subscriptions.current.has(viewId)) return;
      EmbeddedComponentBus.subscribe(viewId);
      const proxy = new EmbeddedComponentProxy(EmbeddedComponentBus, viewId);
      const bag = startEventListeners(proxy, eventHandlerRefs, viewId);
      subscriptions.current.set(viewId, bag);
    },
    [eventHandlerRefs]
  );

  const unsubscribe = useCallback((viewId: string) => {
    const bag = subscriptions.current.get(viewId);
    bag?.forEach((s) => s.remove());
    subscriptions.current.delete(viewId);
    EmbeddedComponentBus.unsubscribe(viewId);
  }, []);

  function cleanup() {
    subscriptions.current.forEach((listeners, viewId) => {
      listeners.forEach((s) => s.remove());
      EmbeddedComponentBus.unsubscribe(viewId);
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
