import type { NativeModule } from 'react-native';
import type {
  AdyenComponent,
  EnvironmentConfiguration,
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
