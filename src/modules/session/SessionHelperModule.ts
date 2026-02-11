import { NativeModules, type EmitterSubscription } from 'react-native';
import type {
  AdyenComponent,
  AdyenError,
  EnvironmentConfiguration,
  SessionConfiguration,
  SessionsResult,
} from '../../core';
import { ModuleMock } from '../base/ModuleMock';
import { SessionWrapper } from './SessionWrapper';
import type { SessionContext } from './types';

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
  assignCompletionHandler(
    callback: (result: SessionsResult) => void
  ): EmitterSubscription;

  /**
   * Subscribe to session error events.
   * @param callback - Called when the session fails with an error.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  assignErrorHandler(
    callback: (error: AdyenError) => void
  ): EmitterSubscription;

  /**
   * Remove all session event listeners.
   */
  removeAllListeners(): void;
}

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule = new SessionWrapper(
  NativeModules.SessionHelper ?? ModuleMock
);
