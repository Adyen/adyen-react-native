import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppConfiguration } from '../settings/types';
import type { ConfigProvider } from './ConfigProvider';

const storeKey = '@config_storage';

export class AsyncStorageConfigProvider implements ConfigProvider {
  constructor(readonly initialConfiguration: AppConfiguration) {}

  async loadConfiguration(): Promise<AppConfiguration> {
    const value = await AsyncStorage.getItem(storeKey);
    if (value) {
      try {
        return { ...this.initialConfiguration, ...JSON.parse(value) };
      } catch (e) {
        console.warn(
          'Failed to parse stored configuration, falling back to initial configuration',
          e
        );
        return this.initialConfiguration;
      }
    }
    return this.initialConfiguration;
  }

  async saveConfiguration(configuration: AppConfiguration): Promise<void> {
    await AsyncStorage.setItem(storeKey, JSON.stringify(configuration));
  }

  async updateConfiguration(partial: Partial<AppConfiguration>): Promise<void> {
    const current = await this.loadConfiguration();
    const merged = { ...current, ...partial };
    await this.saveConfiguration(merged);
  }
}
