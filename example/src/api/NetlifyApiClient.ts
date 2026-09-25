import type {
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  SessionConfiguration,
} from '@adyen/react-native';
import type { PaymentConfiguration, PaymentResponse } from './types';
import type { ApiService } from './ApiService';
import { CHANNEL } from '../Configuration';

const BASE_URL = 'https://www.mystoredemo.io/.netlify/functions';

class NetlifyApiClient implements ApiService {
  readonly usesDirectSessionResult = true;

  private async makeRequest(url: string, body: object): Promise<any> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.message) {
          errorMessage = errorJson.message;
        } else if (typeof errorJson === 'string') {
          errorMessage = errorJson;
        }
      } catch {
        // Fall back to statusText if the response is not JSON.
      }
      throw new Error(`Network Error ${response.status}: ${errorMessage}`);
    }
    return response.json();
  }

  async payments(
    data: PaymentMethodData,
    _configuration: PaymentConfiguration,
    _returnUrl?: string
  ): Promise<PaymentResponse> {
    return this.makeRequest(`${BASE_URL}/payments`, data);
  }

  async paymentDetails(data: PaymentDetailsData): Promise<PaymentResponse> {
    return this.makeRequest(`${BASE_URL}/payments/details`, data);
  }

  async requestSession(
    configuration: PaymentConfiguration,
    returnUrl: string
  ): Promise<SessionConfiguration> {
    const body = {
      merchantAccount: configuration.merchantAccount,
      countryCode: configuration.countryCode,
      amount: { value: configuration.amount, currency: configuration.currency },
      returnUrl,
      channel: CHANNEL,
      reference: 'React Native',
    };
    return this.makeRequest(`${BASE_URL}/sessions`, body);
  }

  async paymentMethods(
    configuration: PaymentConfiguration
  ): Promise<PaymentMethodsResponse> {
    const body = {
      merchantAccount: configuration.merchantAccount,
      countryCode: configuration.countryCode,
      amount: { value: configuration.amount, currency: configuration.currency },
    };
    return this.makeRequest(`${BASE_URL}/paymentMethods`, body);
  }

  async requestSessionResult(
    _sessionId: string,
    _sessionResult: string
  ): Promise<PaymentResponse> {
    throw new Error('requestSessionResult not supported via Netlify');
  }
}

export default new NetlifyApiClient();
