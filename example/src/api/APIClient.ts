// @ts-check

import type {
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  Order,
} from '@adyen/react-native';
import { ENVIRONMENT, CHANNEL } from '../Configuration';
import type {
  PaymentConfiguration,
  SessionResponse,
  PaymentResponse,
  BalanceResponse,
  OrderResponse,
} from './types';

class ApiClient {
  static payments(
    data: PaymentMethodData,
    configuration: PaymentConfiguration,
    returnUrl?: string
  ): Promise<PaymentResponse> {
    console.debug(JSON.stringify(data));
    const body = {
      ...data,
      ...parseConfig(configuration),
      ...parseAmount(configuration, data),
      ...serverConfiguration,
      ...paymentConfiguration,
      returnUrl: returnUrl ?? data.returnUrl,
    };

    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments', body);
  }

  static paymentDetails = (
    data: PaymentDetailsData
  ): Promise<PaymentResponse> => {
    return ApiClient.makeRequest(ENVIRONMENT.url + 'payments/details', data);
  };

  static requestSession = (
    configuration: PaymentConfiguration,
    returnUrl: string
  ): Promise<SessionResponse> => {
    const body = {
      ...parseConfig(configuration),
      ...parseAmount(configuration),
      ...serverConfiguration,
      ...paymentConfiguration,
      returnUrl: returnUrl,
      showRemovePaymentMethodButton: true,
    };
    return ApiClient.makeRequest(ENVIRONMENT.url + 'sessions', body);
  };

  static paymentMethods = (
    configuration: PaymentConfiguration,
    order?: { orderData: any; pspReference: string }
  ): Promise<PaymentMethodsResponse> => {
    const body = {
      ...parseConfig(configuration),
      ...parseAmount(configuration),
      ...serverConfiguration,
      ...(order && { order: parseOrder(order) }),
    };
    return ApiClient.makeRequest(ENVIRONMENT.url + 'paymentMethods', body);
  };

  static tryRemoveStoredCard = async (
    id: string,
    configuration: PaymentConfiguration
  ): Promise<boolean> => {
    let { merchantAccount, shopperReference } = configuration;
    const url =
      ENVIRONMENT.url +
      `storedPaymentMethods/${id}?merchantAccount=${merchantAccount}&shopperReference=${shopperReference}`;
    const request = new Request(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ENVIRONMENT.apiKey,
      },
    });
    try {
      const response = await fetch(request);
      const pspReference = response.headers.get('pspreference');
      console.debug(`PSP Reference - ${pspReference}`);
      return response.status === 204;
    } catch {
      return false;
    }
  };

  static checkBalance = async (
    paymentData: PaymentMethodData,
    configuration: PaymentConfiguration
  ): Promise<BalanceResponse> => {
    const body = {
      paymentMethod: paymentData.paymentMethod,
      ...parseAmount(configuration),
      merchantAccount: configuration.merchantAccount,
      reference: serverConfiguration.reference,
    };
    return ApiClient.makeRequest(
      ENVIRONMENT.url + 'paymentMethods/balance',
      body
    );
  };

  static requestOrder = async (
    configuration: PaymentConfiguration
  ): Promise<OrderResponse> => {
    const body = {
      ...parseAmount(configuration),
      merchantAccount: configuration.merchantAccount,
      reference: serverConfiguration.reference,
    };
    return ApiClient.makeRequest(ENVIRONMENT.url + 'orders', body);
  };

  static cancelOrder = async (
    order: Order,
    configuration: PaymentConfiguration
  ): Promise<OrderResponse> => {
    const body = {
      ...(order && { order: parseOrder(order) }),
      merchantAccount: configuration.merchantAccount,
    };
    return ApiClient.makeRequest(ENVIRONMENT.url + 'orders/cancel', body);
  };

  /** @private */
  static makeRequest = async (url: string, body: any) => {
    const bodyJSON = JSON.stringify(body);
    console.debug(`Request to: ${url}`);
    console.debug(`== ${bodyJSON}`);
    const request = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': ENVIRONMENT.apiKey,
      },
      body: bodyJSON,
    });

    const response = await fetch(request);
    const pspReference = response.headers.get('pspreference');
    console.debug(`PSP Reference - ${pspReference}`);
    const payload = await response.json();
    console.debug(`Response : ${JSON.stringify(payload, null, ' ')}`);
    if (response.ok) {
      return payload;
    }
    throw new Error(`Network Error ${response.status}:
          ${payload.message ?? JSON.stringify(payload)}`);
  };
}

export default ApiClient;

const serverConfiguration = {
  channel: CHANNEL,
  reference: 'React Native',
};

const paymentConfiguration = {
  authenticationData: {
    threeDSRequestData: {
      nativeThreeDS: 'preferred',
    },
  },
  lineItems: [
    {
      quantity: '1',
      amountExcludingTax: '331',
      taxPercentage: '2100',
      description: 'Shoes',
      id: 'Item #1',
      taxAmount: '69',
      amountIncludingTax: '400',
      productUrl: 'URL_TO_PURCHASED_ITEM',
      imageUrl: 'URL_TO_PICTURE_OF_PURCHASED_ITEM',
    },
    {
      quantity: '2',
      amountExcludingTax: '248',
      taxPercentage: '2100',
      description: 'Socks',
      id: 'Item #2',
      taxAmount: '52',
      amountIncludingTax: '300',
      productUrl: 'URL_TO_PURCHASED_ITEM',
      imageUrl: 'URL_TO_PICTURE_OF_PURCHASED_ITEM',
    },
  ],
  recurringProcessingModel: 'CardOnFile',
  shopperInteraction: 'Ecommerce',
};

const parseAmount = (configuration: PaymentConfiguration, data?: any) => ({
  amount: data?.amount ?? {
    value: configuration.amount,
    currency: configuration.currency,
  },
});

const parseConfig = ({
  merchantAccount,
  countryCode,
  shopperReference,
  shopperLocale,
}: PaymentConfiguration) => ({
  merchantAccount,
  countryCode,
  shopperReference,
  shopperLocale,
});

const parseOrder = ({ orderData, pspReference }: any) => ({
  orderData,
  pspReference,
});
