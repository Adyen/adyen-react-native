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
 * Base for native modules that JS subscribes to. Holds the module and exposes it as a
 * `NativeEventEmitter` source.
 *
 * Which events a module can emit is deliberately not mirrored here. Native `supportedEvents()`
 * and the JS `Event` enum are kept in sync by hand, so a second runtime copy of that list added
 * no safety - and subscribing to an event a module never emits is harmless, because the listener
 * simply never fires.
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
