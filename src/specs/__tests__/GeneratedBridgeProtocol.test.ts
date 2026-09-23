//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  CheckoutEvent,
  CheckoutResponse,
  CheckoutTarget,
  Spec as CheckoutSpec,
} from '../NativeAdyenCheckout';
import type { Spec as ActionSpec } from '../NativeAdyenAction';
import type { Spec as CSESpec } from '../NativeAdyenCSE';
import type { NativeProps } from '../NativeAdyenCheckoutComponentView';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false;
type Expect<Value extends true> = Value;
type IsPromise<Value> = Value extends Promise<unknown> ? true : false;

describe('generated bridge protocol', () => {
  it('keeps checkout controls and correlation fields explicit', () => {
    const target: CheckoutTarget = {
      kind: 'storedPaymentMethod',
      id: 'stored-method-id',
    };
    const event: CheckoutEvent = {
      checkoutId: 'checkout-id',
      operationId: 'operation-id',
      requestId: 'request-id',
      kind: 'advancedSubmit',
      payloadJson: '{"paymentMethod":{"type":"scheme"}}',
    };
    const response: CheckoutResponse = {
      checkoutId: event.checkoutId,
      operationId: event.operationId,
      requestId: event.requestId,
      kind: event.kind,
      payloadJson: '{"type":"completed","resultCode":"Authorised"}',
    };

    expect(target.kind).toBe('storedPaymentMethod');
    expect(response.payloadJson).toContain('Authorised');
  });

  it('models commands as asynchronous TurboModule calls', () => {
    type CheckoutSetupIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['setupSession']>>
    >;
    type CheckoutSubmitIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['submit']>>
    >;
    type CheckoutInvalidateIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['invalidate']>>
    >;
    type CheckoutResponseIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['respond']>>
    >;
    type ActionHandleIsAsync = Expect<
      IsPromise<ReturnType<ActionSpec['handle']>>
    >;
    type ActionHideIsAsync = Expect<IsPromise<ReturnType<ActionSpec['hide']>>>;
    type CSEEncryptCardIsAsync = Expect<
      IsPromise<ReturnType<CSESpec['encryptCard']>>
    >;
    type CSEValidateSecurityCodeIsAsync = Expect<
      IsPromise<ReturnType<CSESpec['validateCardSecurityCode']>>
    >;

    const contracts: [
      CheckoutSetupIsAsync,
      CheckoutSubmitIsAsync,
      CheckoutInvalidateIsAsync,
      CheckoutResponseIsAsync,
      ActionHandleIsAsync,
      ActionHideIsAsync,
      CSEEncryptCardIsAsync,
      CSEValidateSecurityCodeIsAsync,
    ] = [true, true, true, true, true, true, true, true];

    expect(contracts).toHaveLength(8);
  });

  it('keeps Fabric registration identity-bound without configuration', () => {
    type HasConfiguration = 'configuration' extends keyof NativeProps
      ? true
      : false;
    type NoConfiguration = Expect<Equal<HasConfiguration, false>>;
    type HasCheckoutIdentity = Expect<
      Equal<'checkoutId' extends keyof NativeProps ? true : false, true>
    >;
    type HasPresenterIdentity = Expect<
      Equal<'presenterId' extends keyof NativeProps ? true : false, true>
    >;
    type HasTargetKind = Expect<
      Equal<'targetKind' extends keyof NativeProps ? true : false, true>
    >;

    const contracts: [
      NoConfiguration,
      HasCheckoutIdentity,
      HasPresenterIdentity,
      HasTargetKind,
    ] = [true, true, true, true];

    expect(contracts).toHaveLength(4);
  });
});
