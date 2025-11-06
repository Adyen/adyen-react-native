import type { NativeModule } from 'react-native';
import { Event } from '../../core/constants';

/**
 *  Generic wrapper for all Native Modules. Controlls sunscriptions and supported events.
 * */
export abstract class EventListenerWrapper {
  nativeModule: NativeModule | any;
  protected supportedEvents: string[];
  abstract name: string;

  constructor(nativeModule: NativeModule, events?: Event[]) {
    this.nativeModule = nativeModule;
    this.supportedEvents = [Event.onError];
    events?.forEach((element: string) => this.supportedEvents.push(element));
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
