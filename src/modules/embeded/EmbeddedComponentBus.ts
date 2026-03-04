import { NativeModules } from 'react-native';
import { EmbeddedComponentBusWrapper } from './EmbeddedComponentBusWrapper';
import { ModuleMock } from '../base/ModuleMock';

/** Communication bus for all embedded Native Modules. */
export const EmbeddedComponentBus = new EmbeddedComponentBusWrapper(
  NativeModules.AdyenComponentBus ?? ModuleMock
);
