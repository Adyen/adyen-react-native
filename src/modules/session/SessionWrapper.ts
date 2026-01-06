import type { NativeModule } from 'react-native';
import type {
  EnvironmentConfiguration,
  SessionConfiguration,
} from '../../core';
import type {
  SessionContext,
  SessionHelperModule,
} from './SessionHelperModule';

/** Native module interface specific to Session */
export interface SessionNativeModule extends NativeModule {
  hide(success: boolean, option?: { message?: string }): void;
  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext>;
}

export class SessionWrapper implements SessionHelperModule {
  private nativeModule: SessionNativeModule;

  constructor(nativeModule: SessionNativeModule) {
    this.nativeModule = nativeModule;
  }

  hide(success: boolean, option?: { message?: string }): void {
    if (option?.message) {
      this.nativeModule.hide(success, option);
    } else {
      this.nativeModule.hide(success, { message: '' });
    }
  }

  createSession(
    session: SessionConfiguration,
    configuration: EnvironmentConfiguration
  ): Promise<SessionContext> {
    return this.nativeModule.createSession(session, configuration);
  }
}
