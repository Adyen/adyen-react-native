import type { TurboModule } from 'react-native';

/**
 * Minimal interface for native modules used as NativeEventEmitter sources.
 * Extends TurboModule (New Architecture) and adds the event emitter contract.
 */
export interface NativeModule extends TurboModule {
  addListener: (eventType: string) => void;
  removeListeners: (count: number) => void;
}

export interface AdyenEventListener {
  get eventEmitterTarget(): NativeModule;
}

/**
 * Base for native modules that JS subscribes to; exposes the module as a `NativeEventEmitter` source.
 * Supported events aren't mirrored here — native and JS `Event` are kept in sync by hand.
 */
export abstract class EventListenerWrapper<
  T extends NativeModule,
> implements AdyenEventListener {
  protected nativeModule: T;

  constructor(nativeModule: T) {
    this.nativeModule = nativeModule;
  }

  /** Returns the native module for use with NativeEventEmitter */
  get eventEmitterTarget(): T {
    return this.nativeModule;
  }
}
