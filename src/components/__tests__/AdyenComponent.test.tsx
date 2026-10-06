//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import type { Checkout } from '../../core';

const capturedProps: Record<string, unknown> = {};
const mockCheckoutHandles = new WeakMap<object, { checkoutId: string }>();
jest.mock('../../specs/NativeAdyenCheckoutComponentView', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Comp = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      Object.assign(capturedProps, props);
      return React.createElement(View, { ref, testID: 'native-adyen-view' });
    }
  );
  return { __esModule: true, default: Comp };
});

jest.mock('../../checkout/createCheckout', () => ({
  checkoutHandleFor: (checkout: object) => mockCheckoutHandles.get(checkout),
}));

import { AdyenComponent } from '../AdyenComponent';

const fakeCheckout = {
  flow: 'advanced',
  paymentMethods: { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
  isAvailable: jest.fn(),
  requiresUserInteraction: jest.fn(),
  submit: jest.fn(),
  invalidate: jest.fn(),
} as unknown as Checkout;
mockCheckoutHandles.set(fakeCheckout, { checkoutId: 'private-checkout-id' });

describe('AdyenComponent', () => {
  beforeEach(() => {
    for (const key of Object.keys(capturedProps)) delete capturedProps[key];
  });

  test('binds the native view to private checkout and presenter identities', () => {
    const { getByTestId } = render(
      <AdyenComponent checkout={fakeCheckout} type="scheme" />
    );

    expect(getByTestId('native-adyen-view')).toBeTruthy();
    expect(capturedProps).toMatchObject({
      checkoutId: 'private-checkout-id',
      targetKind: 'paymentMethod',
      targetValue: 'scheme',
    });
    expect(capturedProps).not.toHaveProperty('configuration');
    expect(capturedProps.presenterId).toEqual(expect.any(String));
  });

  test('preserves the exact stored payment method ID', () => {
    render(
      <AdyenComponent
        checkout={fakeCheckout}
        target={{ kind: 'storedPaymentMethod', id: 'stored-one' }}
      />
    );

    expect(capturedProps).toMatchObject({
      targetKind: 'storedPaymentMethod',
      targetValue: 'stored-one',
    });
  });

  test('creates a fresh private lifecycle identity after remount', () => {
    const first = render(
      <AdyenComponent checkout={fakeCheckout} type="scheme" />
    );
    const firstPresenterID = capturedProps.presenterId;

    first.unmount();
    render(<AdyenComponent checkout={fakeCheckout} type="scheme" />);

    expect(capturedProps.presenterId).toEqual(expect.any(String));
    expect(capturedProps.presenterId).not.toBe(firstPresenterID);
  });

  test('keeps its identity for unchanged renders and replaces it with checkout or target props', () => {
    const replacementCheckout = {
      ...fakeCheckout,
      paymentMethods: { paymentMethods: [{ type: 'ideal', name: 'iDEAL' }] },
    } as Checkout;
    mockCheckoutHandles.set(replacementCheckout, {
      checkoutId: 'replacement-checkout-id',
    });
    const { rerender } = render(
      <AdyenComponent checkout={fakeCheckout} type="scheme" />
    );
    const initialPresenterID = capturedProps.presenterId;

    rerender(<AdyenComponent checkout={fakeCheckout} type="scheme" />);
    expect(capturedProps.presenterId).toBe(initialPresenterID);

    rerender(<AdyenComponent checkout={fakeCheckout} type="ideal" />);
    const targetReplacementPresenterID = capturedProps.presenterId;
    expect(targetReplacementPresenterID).not.toBe(initialPresenterID);

    rerender(<AdyenComponent checkout={replacementCheckout} type="ideal" />);
    expect(capturedProps.presenterId).not.toBe(targetReplacementPresenterID);
  });

  test('renders nothing for a checkout that did not originate from setup', () => {
    const { queryByTestId } = render(
      <AdyenComponent checkout={fakeCheckout} />
    );

    expect(queryByTestId('native-adyen-view')).toBeNull();
  });
});
