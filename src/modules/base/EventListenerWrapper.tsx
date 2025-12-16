import type { NativeModule } from 'react-native';
import { Event } from '../../core/constants';

/**
 *  Generic wrapper for all Native Modules. Controls subscriptions and supported events.
 *  @typeParam T - The specific native module interface for the concrete wrapper
 * */
export abstract class EventListenerWrapper<
  T extends NativeModule = NativeModule,
> {
  protected nativeModule: T;
  protected supportedEvents: string[];
  abstract name: string;

  constructor(nativeModule: T, events: Event[]) {
    this.nativeModule = nativeModule;
    this.supportedEvents = events;
  }

  /** Returns the underlying native module for use with NativeEventEmitter */
  get module(): T {
    return this.nativeModule;
  }

  addListener(eventType: string) {
    this.nativeModule.addListener(eventType);
  }
  removeListeners(count: number) {
    this.nativeModule.removeListeners(count);
  }
  isSupported(event: string): boolean {
    return this.supportedEvents.includes(event);
  }
}
