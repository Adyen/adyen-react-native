/*
 * Copyright (c) 2024 Adyen N.V.
 * This file is open source and available under the MIT license.
 * See the LICENSE file for more info.
 */

export type CountryInfo = {
  name: string;
  currency: string;
};

export const COUNTRY_DATA: Record<string, CountryInfo> = {
  AE: { name: 'United Arab Emirates', currency: 'AED' },
  AT: { name: 'Austria', currency: 'EUR' },
  AU: { name: 'Australia', currency: 'AUD' },
  BE: { name: 'Belgium', currency: 'EUR' },
  BR: { name: 'Brazil', currency: 'BRL' },
  CA: { name: 'Canada', currency: 'CAD' },
  CH: { name: 'Switzerland', currency: 'CHF' },
  CN: { name: 'China', currency: 'CNY' },
  CZ: { name: 'Czech Republic', currency: 'CZK' },
  DE: { name: 'Germany', currency: 'EUR' },
  DK: { name: 'Denmark', currency: 'DKK' },
  ES: { name: 'Spain', currency: 'EUR' },
  FI: { name: 'Finland', currency: 'EUR' },
  FR: { name: 'France', currency: 'EUR' },
  GB: { name: 'United Kingdom', currency: 'GBP' },
  HK: { name: 'Hong Kong', currency: 'HKD' },
  ID: { name: 'Indonesia', currency: 'IDR' },
  IN: { name: 'India', currency: 'INR' },
  IT: { name: 'Italy', currency: 'EUR' },
  JP: { name: 'Japan', currency: 'JPY' },
  KE: { name: 'Kenya', currency: 'KES' },
  KR: { name: 'South Korea', currency: 'KRW' },
  MX: { name: 'Mexico', currency: 'MXN' },
  MY: { name: 'Malaysia', currency: 'MYR' },
  NL: { name: 'Netherlands', currency: 'EUR' },
  NO: { name: 'Norway', currency: 'NOK' },
  NZ: { name: 'New Zealand', currency: 'NZD' },
  PH: { name: 'Philippines', currency: 'PHP' },
  PL: { name: 'Poland', currency: 'PLN' },
  PT: { name: 'Portugal', currency: 'EUR' },
  RU: { name: 'Russia', currency: 'RUB' },
  SE: { name: 'Sweden', currency: 'SEK' },
  SG: { name: 'Singapore', currency: 'SGD' },
  TH: { name: 'Thailand', currency: 'THB' },
  US: { name: 'United States', currency: 'USD' },
  VN: { name: 'Vietnam', currency: 'VND' },
  ZA: { name: 'South Africa', currency: 'ZAR' },
};

export const COUNTRY_CODES = Object.keys(COUNTRY_DATA);

export const getCountryLabel = (countryCode: string): string => {
  const data = COUNTRY_DATA[countryCode];
  return data ? `${data.name} - ${data.currency}` : countryCode;
};

export const getCurrency = (countryCode: string): string | undefined => {
  return COUNTRY_DATA[countryCode]?.currency;
};
