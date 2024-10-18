import { Balance, Order, PaymentMethodData } from "../types";

export interface PartialPaymentConfiguration {

  /** Invoked when the payment component needs a balance check call to be performed. */
  onBalanceCheck(
    paymentData: PaymentMethodData,
    resolve: (balance: Balance) => void,
    reject: (error: Error) => void
  ): void;

  /** Invoked when the payment component needs a partial payment order object. */
  onOrderRequest(
    resolve: (order: Order) => void,
    reject: (error: Error) => void
  ): void;

  /** Invoked when the payment component needs to cancel the order.  */
  onOrderCancel(
    order: Order
  ): void;
}
