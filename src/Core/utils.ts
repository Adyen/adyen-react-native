import { Platform } from 'react-native';
import { Configuration } from './configuration';
import { PaymentMethodsResponse } from './types';

export const checkPaymentMethodsResponse = (
  paymentMethodsResponse: PaymentMethodsResponse
) => {
  if (typeof paymentMethodsResponse === 'string') {
    throw new Error(
      'paymentMethodsResponse was provided but of an incorrect type (should be an object but a string was provided).' +
        'Try JSON.parse("{...}") your paymentMethodsResponse.'
    );
  }

  if (paymentMethodsResponse instanceof Array) {
    throw new Error(
      'paymentMethodsResponse was provided but of an incorrect type (should be an object but an array was provided).' +
        'Please check you are passing the whole response.'
    );
  }

  if (
    paymentMethodsResponse &&
    !paymentMethodsResponse?.paymentMethods?.length &&
    !paymentMethodsResponse?.storedPaymentMethods?.length
  ) {
    console.warn(
      'paymentMethodsResponse was provided but no payment methods were found.'
    );
  }
};

const countryCodeRegex = new RegExp('^[A-Z]{2}$');
const currencyCodeRegex = new RegExp('^[A-Z]{3}$');
const clientKeyRegex = new RegExp('^[a-z]{4,8}_[a-zA-Z0-9]{8,128}$');

export const checkConfiguration = (configuration: Configuration) => {
  if (
    configuration &&
    Platform.OS == "ios" &&
    !configuration.returnUrl
  ) {
    throw new Error(
      `Parameter returnUrl is required`
    );
  }
  
  if (
    configuration &&
    configuration.returnUrl &&
    configuration.returnUrl.startsWith("http")
  ) {
    console.warn(
      'Your `returnUrl` is not a Custom URL scheme. Make sure `redirectFromIssuerMethod` in `\payments` is set to "GET"'
    );
  }

  if (
    configuration &&
    configuration.clientKey &&
    !clientKeyRegex.test(configuration.clientKey)
  ) {
    throw new Error(
      `Invalid client key: ${configuration.clientKey}. ` +
        `Valid client key starts with environment name (e.x. 'live_XXXXXXXXXX').`
    );
  }

  if (configuration && configuration.amount && !configuration.countryCode) {
    console.warn(
      'To show the amount on the Pay button both amount and countryCode must be set.'
    );
  }

  if (
    configuration &&
    configuration.amount &&
    !currencyCodeRegex.test(configuration.amount.currency)
  ) {
    throw new Error(
      `Invalid currency code: ${configuration.amount.currency}. ` +
        `The currency code must be in ISO 4217 "alphabetic code" format. Example: "EUR" or "USD". `
    );
  }

  if (
    configuration &&
    configuration.countryCode &&
    !countryCodeRegex.test(configuration.countryCode)
  ) {
    throw new Error(
      `Invalid country code: ${configuration.countryCode}. ` +
        `The shopper's country code must be in ISO 3166-1 alpha-2 format. Example: "NL" or "US".`
    );
  }
};
