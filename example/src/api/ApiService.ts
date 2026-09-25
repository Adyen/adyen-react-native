import type {
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  SessionConfiguration,
} from '@adyen/react-native';
import type { PaymentConfiguration, PaymentResponse } from './types';

export interface ApiService {
  usesDirectSessionResult?: boolean;

  payments(
    data: PaymentMethodData,
    configuration: PaymentConfiguration,
    returnUrl?: string,
    forceThreeDS?: boolean
  ): Promise<PaymentResponse>;

  paymentDetails(data: PaymentDetailsData): Promise<PaymentResponse>;

  requestSession(
    configuration: PaymentConfiguration,
    returnUrl: string
  ): Promise<SessionConfiguration>;

  requestSessionResult(
    sessionId: string,
    sessionResult: string
  ): Promise<PaymentResponse>;

  paymentMethods(
    configuration: PaymentConfiguration
  ): Promise<PaymentMethodsResponse>;
}
