import type { AppConfiguration } from '../settings/types';
import type { ConfigProvider } from './ConfigProvider';

export class ExternalConfigProvider implements ConfigProvider {
  readonly initialConfiguration: AppConfiguration;

  constructor(baseConfiguration: AppConfiguration, externalConfig?: string) {
    const external = externalConfig
      ? parseExternalConfiguration(externalConfig)
      : null;
    this.initialConfiguration = external
      ? { ...baseConfiguration, ...external }
      : baseConfiguration;
  }

  async loadConfiguration(): Promise<AppConfiguration> {
    return this.initialConfiguration;
  }

  async saveConfiguration(): Promise<void> {
    // No-op: external configuration is read-only.
  }

  async updateConfiguration(): Promise<void> {
    // No-op: external configuration is read-only.
  }
}

const parseExternalConfiguration = (
  externalConfig: string
): Partial<AppConfiguration> | null => {
  try {
    const config = JSON.parse(externalConfig);
    const card = config.CARD_CONFIGURATION;
    if (!card) return null;

    return {
      cardSettings: {
        holderNameRequired: card.showCardholderName,
        addressVisibility: card.addressMode,
        showStorePaymentField: card.showStorePaymentField,
        hideCvcStoredCard:
          card.showCvcForStoredCard !== undefined
            ? !card.showCvcForStoredCard
            : undefined,
        hideCvc: card.showCvc !== undefined ? !card.showCvc : undefined,
        kcpVisibility: card.kcpFieldVisibility,
        socialSecurity: card.socialSecurityNumberFieldVisibility,
      },
    };
  } catch {
    console.warn('Failed to parse externalConfig');
    return null;
  }
};
