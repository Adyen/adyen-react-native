import type { NativeModule } from 'react-native';
import type { Event } from '../../core';

/**
 * Collects events from class hierarchy via static `events` property.
 * Traverses prototype chain to include inherited events.
 */
function getRegisteredEvents(
  target: abstract new (...args: any[]) => any
): readonly Event[] {
  const events: Event[] = [];
  let current: any = target;

  while (current && current !== Function.prototype) {
    const classEvents = current.events;
    if (Array.isArray(classEvents)) {
      events.push(...classEvents);
    }
    current = Object.getPrototypeOf(current);
  }

  return [...new Set(events)] as readonly Event[];
}

/**
 * Generic wrapper for all Native Modules. Controls subscriptions and supported events.
 * Subclasses declare events via static `events` property.
 * @typeParam T - The specific native module interface for the concrete wrapper
 */
export abstract class EventListenerWrapper<
  T extends NativeModule = NativeModule,
> {
  protected nativeModule: T;
  protected supportedEvents: readonly string[];
  abstract get name(): string;

  constructor(nativeModule: T) {
    this.nativeModule = nativeModule;
    this.supportedEvents = getRegisteredEvents(
      this.constructor as abstract new (...args: any[]) => any
    );
  }

  /** Pass through to native module addListener */
  addListener(eventType: string) {
    this.nativeModule.addListener(eventType);
  }

  /** Pass through to native module removeListeners */
  removeListeners(count: number) {
    this.nativeModule.removeListeners(count);
  }

  /** Checks if the event is supported by the native module */
  isSupported(event: string): boolean {
    return this.supportedEvents.includes(event);
  }
}
