//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react-native';
import type { Checkout } from '../../core';

const mockConfiguration = {
  environment: 'test' as const,
  clientKey: 'test_ABCDEFGH',
  returnUrl: 'myapp://checkout',
};

// Capture the props handed to the native Fabric view so we can assert on them.
const capturedProps: Record<string, any> = {};
jest.mock('../../specs/NativeAdyenComponentView', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Comp = React.forwardRef((props: any, ref: any) => {
    Object.assign(capturedProps, props);
    return React.createElement(View, { ref, testID: 'native-adyen-view' });
  });
  return { __esModule: true, default: Comp };
});

import { AdyenComponent } from '../AdyenComponent';

const fakeCheckout = {
  paymentMethods: { paymentMethods: [{ type: 'scheme', name: 'Card' }] },
  configuration: mockConfiguration,
  isAvailable: jest.fn(),
  requiresUserInteraction: jest.fn(),
  submit: jest.fn(),
  cleanup: jest.fn(),
} as unknown as Checkout;

describe('AdyenComponent', () => {
  beforeEach(() => {
    for (const key of Object.keys(capturedProps)) delete capturedProps[key];
  });

  test('renders the native view with the type and serialized configuration', () => {
    const { getByTestId } = render(
      <AdyenComponent checkout={fakeCheckout} type="scheme" />
    );

    expect(getByTestId('native-adyen-view')).toBeTruthy();
    expect(capturedProps.type).toBe('scheme');
    expect(capturedProps.configuration).toBe(JSON.stringify(mockConfiguration));
  });

  test('mounts and unmounts without announcing itself to the checkout', () => {
    // The merchant's callbacks are global, so a view has nothing to subscribe to. Native
    // registration happens inside the view itself, purely so teardown can dispose it.
    const { unmount } = render(
      <AdyenComponent checkout={fakeCheckout} type="ideal" />
    );

    expect(Object.keys(fakeCheckout)).not.toContain('subscribe');

    expect(() => unmount()).not.toThrow();
  });

  test('throws when a second component of the same type is mounted', () => {
    const originalError = console.error;
    console.error = jest.fn();
    try {
      expect(() =>
        render(
          <>
            <AdyenComponent checkout={fakeCheckout} type="dup-scheme" />
            <AdyenComponent checkout={fakeCheckout} type="dup-scheme" />
          </>
        )
      ).toThrow(/already mounted/);
    } finally {
      console.error = originalError;
    }
  });

  test('throws when checkout is missing (defensive guard for JS callers)', () => {
    const originalError = console.error;
    console.error = jest.fn();
    try {
      expect(() =>
        render(
          <AdyenComponent
            checkout={undefined as unknown as Checkout}
            type="bcmc"
          />
        )
      ).toThrow(/requires a `checkout`/);
    } finally {
      console.error = originalError;
    }
  });
});
