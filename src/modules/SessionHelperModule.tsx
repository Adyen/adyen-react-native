import { NativeModules } from 'react-native';
import { SessionResponse } from '../core/types';
import { AdyenComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from './ModuleMock';

/** Describes a native module capable of creating new sessions. */
export interface SessionHelperModule extends AdyenComponent {
  /**
   * Initiates session on client side and provides session context for sessionData and SessionID.
   */
  createSession: (session: any, configuration: any) => Promise<SessionResponse>;
}

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule =
  NativeModules.SessionHelper ?? ModuleMock;
