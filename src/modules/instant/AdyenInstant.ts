import { NativeModules } from 'react-native';
import type { AdyenActionComponent } from '../../core/types';
import { ModuleMock } from '../base/ModuleMock';
import { InstantWrapper } from './InstantWrapper';

export interface InstantModule extends AdyenActionComponent {}

/** Generic Redirect component */
export const AdyenInstant: InstantModule = new InstantWrapper(
  NativeModules.AdyenInstant ?? ModuleMock
);
