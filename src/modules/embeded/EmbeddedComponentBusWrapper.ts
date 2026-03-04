import { AddressLookupModule, type AddressLookupNativeModule } from '../base/AddressLookupModule';

/** Native module interface specific to EmbeddedComponentBus */
export type EmbeddedComponentBusNativeModule = AddressLookupNativeModule;

/**
 *  Communication bus for all embedded Native Modules.
 * */
export class EmbeddedComponentBusWrapper extends AddressLookupModule<EmbeddedComponentBusNativeModule> {
  name: string = 'EmbeddedComponentBus';
}
