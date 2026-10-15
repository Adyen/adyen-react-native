//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import type {
  CheckoutEvent,
  CheckoutResponse,
  ControllerDescriptor,
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
type Has<Shape, Key extends PropertyKey> = Key extends keyof Shape
  ? true
  : false;

describe('generated bridge protocol', () => {
  it('keeps checkout controls and correlation fields explicit', () => {
    const controller: ControllerDescriptor = {
      controllerId: 'controller-id',
      requiresUserInteraction: true,
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
      operationId: event.operationId!,
      requestId: event.requestId!,
      kind: event.kind,
      payloadJson: '{"type":"completed","resultCode":"Authorised"}',
    };

    expect(controller.requiresUserInteraction).toBe(true);
    expect(response.payloadJson).toContain('Authorised');
  });

  it('addresses payment methods by id and controllers by controller id', () => {
    type IsAvailableByID = Expect<
      Equal<Parameters<CheckoutSpec['isAvailable']>, [string, string]>
    >;
    type CreateControllerByID = Expect<
      Equal<Parameters<CheckoutSpec['createController']>, [string, string]>
    >;
    type CreateControllerDescriptor = Expect<
      Equal<
        ReturnType<CheckoutSpec['createController']>,
        Promise<ControllerDescriptor>
      >
    >;
    type SubmitControllerByID = Expect<
      Equal<Parameters<CheckoutSpec['submitController']>, [string, string]>
    >;
    type NoTargetQuery = Expect<
      Equal<Has<CheckoutSpec, 'requiresUserInteraction'>, false>
    >;
    type NoTargetSubmit = Expect<Equal<Has<CheckoutSpec, 'submit'>, false>>;

    const contracts: [
      IsAvailableByID,
      CreateControllerByID,
      CreateControllerDescriptor,
      SubmitControllerByID,
      NoTargetQuery,
      NoTargetSubmit,
    ] = [true, true, true, true, true, true];

    expect(contracts).toHaveLength(6);
  });

  it('models commands as asynchronous TurboModule calls', () => {
    type SDKVersionIsGenerated = Expect<
      Equal<ReturnType<CheckoutSpec['setSdkVersion']>, void>
    >;
    type CheckoutSetupIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['setupSession']>>
    >;
    type CheckoutAdvancedSetupIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['setupAdvanced']>>
    >;
    type CheckoutIsAvailableIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['isAvailable']>>
    >;
    type CheckoutCreateControllerIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['createController']>>
    >;
    type CheckoutSubmitControllerIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['submitController']>>
    >;
    type CheckoutStartDropInIsAsync = Expect<
      IsPromise<ReturnType<CheckoutSpec['startDropIn']>>
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
      SDKVersionIsGenerated,
      CheckoutSetupIsAsync,
      CheckoutAdvancedSetupIsAsync,
      CheckoutIsAvailableIsAsync,
      CheckoutCreateControllerIsAsync,
      CheckoutSubmitControllerIsAsync,
      CheckoutStartDropInIsAsync,
      CheckoutInvalidateIsAsync,
      CheckoutResponseIsAsync,
      ActionHandleIsAsync,
      ActionHideIsAsync,
      CSEEncryptCardIsAsync,
      CSEValidateSecurityCodeIsAsync,
    ] = [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ];

    expect(contracts).toHaveLength(13);
  });

  it('binds Fabric views to a checkout and controller identity only', () => {
    type NoConfiguration = Expect<
      Equal<Has<NativeProps, 'configuration'>, false>
    >;
    type HasCheckoutIdentity = Expect<Equal<NativeProps['checkoutId'], string>>;
    type HasControllerIdentity = Expect<
      Equal<NativeProps['controllerId'], string>
    >;
    type NoPresenterIdentity = Expect<
      Equal<Has<NativeProps, 'presenterId'>, false>
    >;
    type NoTargetKind = Expect<Equal<Has<NativeProps, 'targetKind'>, false>>;
    type NoTargetValue = Expect<Equal<Has<NativeProps, 'targetValue'>, false>>;
    type KeepsLayoutEvents = Expect<
      Equal<Has<NativeProps, 'onLayoutChange'>, true>
    >;

    const contracts: [
      NoConfiguration,
      HasCheckoutIdentity,
      HasControllerIdentity,
      NoPresenterIdentity,
      NoTargetKind,
      NoTargetValue,
      KeepsLayoutEvents,
    ] = [true, true, true, true, true, true, true];

    expect(contracts).toHaveLength(7);
  });
});
