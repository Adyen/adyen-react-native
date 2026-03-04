import { createContext, useContext } from 'react';
import { COMPONENT_MISSING_CONTEXT_ERROR } from './constants';

/**
 * Context for embedded components to subscribe/unsubscribe to MessageBus events.
 */
export interface AdyenComponentContextType {
  /** Subscribe a component type to MessageBus events */
  subscribe: (componentType: string) => void;
  /** Unsubscribe a component type from MessageBus events */
  unsubscribe: (componentType: string) => void;
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
