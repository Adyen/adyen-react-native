import { NativeEventEmitter } from 'react-native';
import type { EventSubscription } from 'react-native';
import type { NativeModule } from '../base/EventListenerWrapper';
import {
  Event,
  type AdyenComponent,
  type AdyenError,
  type EnvironmentConfiguration,
  type HideOption,
  type SessionConfiguration,
  type SessionsResult,
} from '../../core';
import type { SessionHelperModule } from './SessionHelperModule';
import type { SessionContext } from './types';

/** Native module interface specific to Session */
interface SessionNativeModule extends NativeModule, AdyenComponent {
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;
}

type SessionEventMap = {
  [Event.onSessionComplete]: [SessionsResult];
  [Event.onSessionError]: [AdyenError];
};

export class SessionWrapper implements SessionHelperModule {
  private readonly nativeModule: SessionNativeModule;
  private readonly eventEmitter: NativeEventEmitter<SessionEventMap>;
  private readonly subscriptions: Map<string, EventSubscription> = new Map();

  constructor(nativeModule: SessionNativeModule) {
    this.nativeModule = nativeModule;
    this.eventEmitter = new NativeEventEmitter<SessionEventMap>(nativeModule);
  }

  hide(success: boolean, option?: HideOption): void {
    this.nativeModule.hide(success, { message: option?.message ?? '' });
  }

  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext> {
    return this.nativeModule.createSession(session, configuration);
  }

  /**
   * Subscribe to session completion events.
   * @param callback - Called when the session completes successfully.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  assignCompletionHandler(
    callback: (result: SessionsResult) => void
  ): EventSubscription {
    this.subscriptions.get(Event.onSessionComplete)?.remove();
    const subscription = this.eventEmitter.addListener(
      Event.onSessionComplete,
      callback
    );
    this.subscriptions.set(Event.onSessionComplete, subscription);
    return subscription;
  }

  /**
   * Subscribe to session error events.
   * @param callback - Called when the session fails with an error.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  assignErrorHandler(callback: (error: AdyenError) => void): EventSubscription {
    this.subscriptions.get(Event.onSessionError)?.remove();
    const subscription = this.eventEmitter.addListener(
      Event.onSessionError,
      callback
    );
    this.subscriptions.set(Event.onSessionError, subscription);
    return subscription;
  }

  /**
   * Remove all session event listeners.
   */
  removeAllListeners(): void {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions.clear();
  }
}
