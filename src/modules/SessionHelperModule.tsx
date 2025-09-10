import { NativeModules } from 'react-native';
import type {
  PaymentMethodsResponse,
  SessionConfiguration,
} from '../core/types';
import type { AdyenComponent } from '../core/AdyenNativeModules';
import { ModuleMock } from './ModuleMock';
import type { EnvironmentConfiguration } from '../core/configurations/Configuration';

/** Describes a native module capable of creating new sessions. */
export interface SessionHelperModule extends AdyenComponent {
  /**
   * Initiates session on client side and provides session context for sessionData and SessionID.
   * @param session - Session configuration (id and SessionData)
   * @param configuration - Environment configuration
   */
  createSession: (
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ) => Promise<SessionContext>;
}

/** Collection of session helper methods */
export const SessionHelper: SessionHelperModule =
  NativeModules.SessionHelper ?? ModuleMock;

/** @internal Session context */
export interface SessionContext {
  paymentMethods: PaymentMethodsResponse;
  [key: string]: any;
}
