import type {
  PaymentMethodsResponse,
  PaymentMethodData,
  PaymentDetailsData,
  Order,
  SessionConfiguration,
} from '@adyen/react-native';
import type {
  PaymentConfiguration,
  PaymentResponse,
  BalanceResponse,
  OrderResponse,
} from './types';

export interface ApiService {
  usesDirectSessionResult?: boolean;

  payments(
    data: PaymentMethodData,
    configuration: PaymentConfiguration,
    returnUrl?: string
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
    configuration: PaymentConfiguration,
    order?: Order
  ): Promise<PaymentMethodsResponse>;

  tryRemoveStoredCard(
    id: string,
    configuration: PaymentConfiguration
  ): Promise<boolean>;

  checkBalance(
    paymentData: PaymentMethodData,
    configuration: PaymentConfiguration
  ): Promise<BalanceResponse>;

  requestOrder(configuration: PaymentConfiguration): Promise<OrderResponse>;

  cancelOrder(
    order: Order,
    configuration: PaymentConfiguration
  ): Promise<OrderResponse>;
}
