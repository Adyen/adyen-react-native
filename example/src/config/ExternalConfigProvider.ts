import type { AppConfiguration, CardSettings } from '../settings/types';
import type { ConfigProvider } from './ConfigProvider';

export class ExternalConfigProvider implements ConfigProvider {
  readonly initialConfiguration: AppConfiguration;

  constructor(baseConfiguration: AppConfiguration, externalConfig?: string) {
    const external = externalConfig
      ? parseExternalConfiguration(externalConfig)
      : null;
    this.initialConfiguration = external
      ? {
          ...baseConfiguration,
          ...external,
          cardSettings: {
            ...(baseConfiguration.cardSettings ?? {}),
            ...(external.cardSettings ?? {}),
          },
        }
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

    return { cardSettings: parseCardSettings(card) };
  } catch {
    console.warn('Failed to parse externalConfig');
    return null;
  }
};

const parseCardSettings = (
  card: Record<string, any>
): Partial<CardSettings> => {
  const settings: Partial<CardSettings> = {};

  if (typeof card.showCardholderName === 'boolean') {
    settings.holderNameRequired = card.showCardholderName;
  }

  const addressMode = card.addressVisibility ?? card.addressMode;
  if (typeof addressMode === 'string') {
    settings.addressVisibility =
      addressMode as CardSettings['addressVisibility'];
  }

  if (typeof card.showStorePaymentField === 'boolean') {
    settings.showStorePaymentField = card.showStorePaymentField;
  }

  if (typeof card.showCvcForStoredCard === 'boolean') {
    settings.hideCvcStoredCard = !card.showCvcForStoredCard;
  }

  if (typeof card.showCvc === 'boolean') {
    settings.hideCvc = !card.showCvc;
  }

  if (typeof card.kcpFieldVisibility === 'string') {
    settings.kcpVisibility =
      card.kcpFieldVisibility as CardSettings['kcpVisibility'];
  }

  if (typeof card.socialSecurityNumberFieldVisibility === 'string') {
    settings.socialSecurity =
      card.socialSecurityNumberFieldVisibility as CardSettings['socialSecurity'];
  }

  return settings;
};
