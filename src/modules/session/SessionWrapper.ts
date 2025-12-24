import {
  NativeEventEmitter,
  type EmitterSubscription,
  type NativeModule,
} from 'react-native';
import type { EnvironmentConfiguration } from '../../core/configurations';
import type {
  AdyenError,
  SessionConfiguration,
  SessionsResult,
} from '../../core/types';
import type {
  SessionContext,
  SessionHelperModule,
} from './SessionHelperModule';
import { Event } from '../../core/constants';

/** Native module interface specific to Session */
export interface SessionNativeModule extends NativeModule {
  hide(success: boolean, option?: { message?: string }): void;
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;
}

export class SessionWrapper implements SessionHelperModule {
  private nativeModule: SessionNativeModule;
  private eventEmitter: NativeEventEmitter;
  private subscriptions: EmitterSubscription[] = [];

  constructor(nativeModule: SessionNativeModule) {
    this.nativeModule = nativeModule;
    this.eventEmitter = new NativeEventEmitter(nativeModule);
  }

  hide(success: boolean, option?: { message?: string }): void {
    if (option?.message) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
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
    const subscription = this.eventEmitter.addListener(
      Event.onSessionComplete,
      callback
    );
    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Subscribe to session error events.
   * @param callback - Called when the session fails with an error.
   * @returns EmitterSubscription that can be used to remove the listener.
   */
  onError(callback: (error: AdyenError) => void): EmitterSubscription {
    const subscription = this.eventEmitter.addListener(
      Event.onSessionError,
      callback
    );
    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Remove all session event listeners.
   */
  removeAllListeners(): void {
    this.subscriptions.forEach((sub) => sub.remove());
    this.subscriptions = [];
  }
}
