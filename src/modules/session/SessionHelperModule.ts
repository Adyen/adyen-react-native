import { NativeModules } from 'react-native';
import type {
  AdyenComponent,
  EnvironmentConfiguration,
  SessionConfiguration,
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
}

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule = new SessionWrapper(
  NativeModules.SessionHelper ?? ModuleMock
);
