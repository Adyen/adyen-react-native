import { createContext, useContext } from 'react';
import { COMPONENT_MISSING_CONTEXT_ERROR } from './constants';

/**
 * Context for embedded components to subscribe/unsubscribe to MessageBus events.
 */
export interface AdyenComponentContextType {
  /** Subscribe an embedded view to MessageBus events by its viewId (reactTag) */
  subscribe: (viewId: string) => void;
  /** Unsubscribe an embedded view from MessageBus events by its viewId (reactTag) */
  unsubscribe: (viewId: string) => void;
}

export const AdyenComponentContext =
  createContext<AdyenComponentContextType | null>(null);

/**
 * Hook to access the AdyenComponentContext for subscribing/unsubscribing to MessageBus events.
 * Must be used within an AdyenCheckout provider.
 */
export const useComponent = (): AdyenComponentContextType => {
  const context = useContext(AdyenComponentContext);
  if (!context) {
    throw new Error(COMPONENT_MISSING_CONTEXT_ERROR);
  }
  return context;
};
