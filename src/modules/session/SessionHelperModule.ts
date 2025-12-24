import { NativeModules, type EmitterSubscription } from 'react-native';
import type {
  AdyenError,
  PaymentMethodsResponse,
  SessionConfiguration,
  SessionsResult,
} from '../../core/types';
import type { AdyenComponent } from '../../core/types';
import { ModuleMock } from '../base/ModuleMock';
import type { EnvironmentConfiguration } from '../../core/configurations';
import { SessionWrapper } from './SessionWrapper';

/** Describes a native module capable of creating new sessions. */
export interface SessionHelperModule extends AdyenComponent {
  /**
   * Initiates session on client side and provides session context for sessionData and SessionID.
   * @param session - Session configuration (id and SessionData)
   * @param configuration - Environment configuration
   */
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;

  /**
   * Subscribe to session completion events.
   * @param callback - Called when the session completes successfully.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  onComplete(callback: (result: SessionsResult) => void): EmitterSubscription;

  /**
   * Subscribe to session error events.
   * @param callback - Called when the session fails with an error.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  onError(callback: (error: AdyenError) => void): EmitterSubscription;

  /**
   * Remove all session event listeners.
   */
  removeAllListeners(): void;
}

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule = new SessionWrapper(
  NativeModules.SessionHelper ?? ModuleMock
);

/** @internal Session context */
export interface SessionContext {
  paymentMethods: PaymentMethodsResponse;
  [key: string]: any;
}
