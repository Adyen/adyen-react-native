import {ResultCode, PaymentAction, Order} from '@adyen/react-native';

/**
 * {@link https://docs.adyen.com/api-explorer/Checkout/70/post/payments#responses-200 API Explorer /payments response}
 */
export interface PaymentResponse {
  order?: Order;
  action?: PaymentAction;
  resultCode: ResultCode;
}
