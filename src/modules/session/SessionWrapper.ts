import {
  type NativeModule,
  type EmitterSubscription,
  NativeEventEmitter,
} from 'react-native';
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

export class SessionWrapper implements SessionHelperModule {
  private nativeModule: SessionNativeModule;
  private eventEmitter: NativeEventEmitter;
  private subscriptions: Map<string, EmitterSubscription> = new Map();

  constructor(nativeModule: SessionNativeModule) {
    this.nativeModule = nativeModule;
    this.eventEmitter = new NativeEventEmitter(nativeModule);
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
  onComplete(callback: (result: SessionsResult) => void): EmitterSubscription {
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
  onError(callback: (error: AdyenError) => void): EmitterSubscription {
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
