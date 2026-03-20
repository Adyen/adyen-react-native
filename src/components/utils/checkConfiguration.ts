import type { Configuration } from '../../core';

export const checkConfiguration = (configuration: Configuration) => {
  if (!configuration?.returnUrl) {
    throw new Error(`Parameter returnUrl is required`);
  }

  if (configuration?.returnUrl?.startsWith('http')) {
    console.warn(
      'Your `returnUrl` is not a Custom URL scheme. Make sure `redirectFromIssuerMethod` in `payments` is set to "GET"'
    );
  }

  if (!configuration?.clientKey) {
    throw new Error(`Parameter clientKey is required`);
  } else if (!clientKeyRegex.test(configuration.clientKey)) {
    throw new Error(
      `Invalid client key: ${configuration.clientKey}. ` +
        `Valid client key starts with environment name (e.x. 'live_XXXXXXXXXX').`
    );
  }

  if (configuration?.amount && !configuration?.countryCode) {
    console.warn(
      'To show the amount on the Pay button both amount and countryCode must be set.'
    );
  }

  if (
    configuration?.amount &&
    !currencyCodeRegex.test(configuration.amount.currency)
  ) {
    throw new Error(
      `Invalid currency code: ${configuration.amount.currency}. ` +
        `The currency code must be in ISO 4217 "alphabetic code" format. Example: "EUR" or "USD". `
    );
  }

  if (
    configuration?.countryCode &&
    !countryCodeRegex.test(configuration.countryCode)
  ) {
    throw new Error(
      `Invalid country code: ${configuration.countryCode}. ` +
        `The shopper's country code must be in ISO 3166-1 alpha-2 format. Example: "NL" or "US".`
    );
  }
};

const countryCodeRegex = /^[A-Z]{2}$/;
const currencyCodeRegex = /^[A-Z]{3}$/;
const clientKeyRegex = /^[a-z]{4,8}_[a-zA-Z0-9]{8,128}$/;
