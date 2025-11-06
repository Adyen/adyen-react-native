import type { NativeModule } from 'react-native';
import type { EnvironmentConfiguration } from '../../core/configurations';
import type { SessionConfiguration } from '../../core/types';
import type {
  SessionContext,
  SessionHelperModule,
} from './SessionHelperModule';

export class SessionWrapper implements SessionHelperModule {
  nativeModule: NativeModule | any;

  constructor(nativeModule: NativeModule) {
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
