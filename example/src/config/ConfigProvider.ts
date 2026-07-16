import type { AppConfiguration } from '../settings/types';

export interface ConfigProvider {
  initialConfiguration: AppConfiguration;
  loadConfiguration(): Promise<AppConfiguration>;
  saveConfiguration(configuration: AppConfiguration): Promise<void>;
  updateConfiguration(partial: Partial<AppConfiguration>): Promise<void>;
}
