import {
  AdyenCheckout,
  AdyenComponent,
  AdyenDropIn,
  type AdvancedCallbacks,
  type Checkout,
  type Configuration,
  type PaymentMethodsResponse,
  type SessionCallbacks,
  type SessionConfiguration,
} from '@adyen/react-native';
import type { JSX } from 'react';

declare const configuration: Configuration;
declare const session: SessionConfiguration;
declare const paymentMethods: PaymentMethodsResponse;
declare const sessionCallbacks: SessionCallbacks;
declare const advancedCallbacks: AdvancedCallbacks;

export async function useSession(): Promise<void> {
  const checkout = await AdyenCheckout.setup(
    session,
    configuration,
    sessionCallbacks
  );
  await checkout.isAvailable({ kind: 'paymentMethod', type: 'scheme' });
  await checkout.requiresUserInteraction({
    kind: 'storedPaymentMethod',
    id: 'stored-card-id',
  });
  await checkout.invalidate();
}

export async function useAdvanced(): Promise<void> {
  const checkout = await AdyenCheckout.setupAdvanced(
    paymentMethods,
    configuration,
    advancedCallbacks
  );
  await AdyenDropIn.start(checkout);
}

export function Card(checkout: Checkout): JSX.Element {
  return (
    <AdyenComponent
      checkout={checkout}
      target={{ kind: 'paymentMethod', type: 'scheme' }}
    />
  );
}
