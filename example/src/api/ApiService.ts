import type {
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  SessionConfiguration,
} from '@adyen/react-native';
import type { PaymentConfiguration, PaymentResponse } from './types';

/** Merchant-server calls used by the Sessions flow. */
export interface SessionsApiService {
  usesDirectSessionResult?: boolean;

  requestSession(
    configuration: PaymentConfiguration,
    returnUrl: string
  ): Promise<SessionConfiguration>;

  requestSessionResult(
    sessionId: string,
    sessionResult: string
  ): Promise<PaymentResponse>;
}

/** Merchant-server calls used by the Advanced flow. */
export interface AdvancedApiService {
  paymentMethods(
    configuration: PaymentConfiguration
  ): Promise<PaymentMethodsResponse>;

  payments(
    data: PaymentMethodData,
    configuration: PaymentConfiguration,
    returnUrl?: string,
    forceThreeDS?: boolean
  ): Promise<PaymentResponse>;

  paymentDetails(data: PaymentDetailsData): Promise<PaymentResponse>;
}
