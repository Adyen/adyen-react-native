import type { NativeModule } from 'react-native';
import { Event } from '../../core';

/** Extended NativeModule interface with optional getConstants */
export interface NativeModuleWithConstants extends NativeModule {
  getConstants?: () => { supportedEvents?: string[] };
}

export interface AdyenEventListener {
  isSupported(event: Event): boolean;
  get eventEmitterTarget(): NativeModule;
}

/**
 * Generic wrapper for all Native Modules. Controls subscriptions and supported events.
 * Supported events are read from native module's getConstants().
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class EventListenerWrapper<
  T extends NativeModuleWithConstants,
> implements AdyenEventListener {
  protected nativeModule: T;
  protected supportedEvents: readonly string[];
  abstract get name(): string;

  constructor(nativeModule: T) {
    this.nativeModule = nativeModule;
    const constants = nativeModule.getConstants?.();
    this.supportedEvents = constants?.supportedEvents ?? [];
  }

  /** Returns the native module for use with NativeEventEmitter */
  get eventEmitterTarget(): T {
    return this.nativeModule;
  }

  /** Checks if the event is supported by the native module */
  isSupported(event: Event): boolean {
    return this.supportedEvents.includes(event);
  }
}
