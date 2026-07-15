import { ResultCode } from '@adyen/react-native';
import type { PaymentResponse } from '../../../api/types';
import type { DropInModule, Order } from '@adyen/react-native';
import ApiClient from '../../../api/APIClient';
import type { PaymentConfiguration } from '../../../api/types';

function isRefusedInPartialPaymentFlow(response: PaymentResponse) {
  const order = response?.order;
  return isRefused(response) && order && isNonFullyPaidOrder(order);
}

function isRefused(response: PaymentResponse) {
  return response.resultCode === 'Refused';
}

function isNonFullyPaidOrder(order: Order) {
  const remainingAmount = order.remainingAmount?.value ?? 0;
  return remainingAmount > 0;
}

export async function processPartialPaymentResult(
  result: PaymentResponse,
  dropInComponent: DropInModule,
  configuration: PaymentConfiguration
): Promise<PaymentResponse | undefined> {
  var outcome: ResultCode = result.resultCode;
  const action = result.action;
  const order = result?.order;
  if (action) {
    dropInComponent.handle(action);
    return;
  } else if (isRefusedInPartialPaymentFlow(result)) {
    outcome = ResultCode.refused;
  } else if (order && isNonFullyPaidOrder(order)) {
    try {
      const paymentMethods = await ApiClient.paymentMethods(
        configuration,
        order
      );
      dropInComponent.providePaymentMethods(paymentMethods, order);
      return;
    } catch (error) {
      outcome = ResultCode.error;
      console.error(error);
    }
  }
  return { resultCode: outcome };
}
