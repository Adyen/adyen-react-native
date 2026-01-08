import type { NativeModule } from 'react-native';
import type {
  AdyenComponent,
  EnvironmentConfiguration,
  HideOption,
  SessionConfiguration,
} from '../../core';
import type { SessionHelperModule } from './SessionHelperModule';
import type { SessionContext } from './types';

/** Native module interface specific to Session */
interface SessionNativeModule extends NativeModule, AdyenComponent {
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;
}

export class SessionWrapper implements SessionHelperModule {
  private readonly nativeModule: SessionNativeModule;

  constructor(nativeModule: SessionNativeModule) {
    this.nativeModule = nativeModule;
  }

  hide(success: boolean, option?: HideOption): void {
    this.nativeModule.hide(success, { message: option?.message ?? '' });
  }

  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext> {
    return this.nativeModule.createSession(session, configuration);
  }
}
