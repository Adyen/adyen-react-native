//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import type { Controller } from '../../core';

const capturedProps: Record<string, unknown> = {};
const mockControllerHandles = new WeakMap<
  object,
  { checkoutId: string; controllerId: string; isActive(): boolean }
>();
jest.mock('../../specs/NativeAdyenCheckoutComponentView', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Comp = React.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      for (const key of Object.keys(capturedProps)) delete capturedProps[key];
      Object.assign(capturedProps, props);
      return React.createElement(View, { ref, testID: 'native-adyen-view' });
    }
  );
  return { __esModule: true, default: Comp };
});

jest.mock('../../checkout/createController', () => ({
  controllerHandleFor: (controller: object) =>
    mockControllerHandles.get(controller),
}));

import { AdyenComponent } from '../AdyenComponent';

function fakeController(
  controllerId: string,
  requiresUserInteraction = true
): Controller {
  const controller = {
    paymentMethod: { id: `pm-${controllerId}`, type: 'scheme', name: 'Card' },
    requiresUserInteraction,
    submit: jest.fn(),
  } as unknown as Controller;
  mockControllerHandles.set(controller, {
    checkoutId: 'private-checkout-id',
    controllerId,
    isActive: () => true,
  });
  return controller;
}

describe('AdyenComponent', () => {
  beforeEach(() => {
    for (const key of Object.keys(capturedProps)) delete capturedProps[key];
  });

  test('binds the native view to the private checkout and controller identities', () => {
    const { getByTestId } = render(
      <AdyenComponent controller={fakeController('controller-one')} />
    );

    expect(getByTestId('native-adyen-view')).toBeTruthy();
    expect(capturedProps).toMatchObject({
      checkoutId: 'private-checkout-id',
      controllerId: 'controller-one',
    });
    expect(capturedProps.onLayoutChange).toEqual(expect.any(Function));
  });

  test('forwards no target, presenter, or configuration props', () => {
    render(<AdyenComponent controller={fakeController('controller-two')} />);

    for (const key of [
      'presenterId',
      'targetKind',
      'targetValue',
      'configuration',
      'controller',
      'paymentMethod',
    ]) {
      expect(capturedProps).not.toHaveProperty(key);
    }
  });

  test('passes view props and merges the style', () => {
    render(
      <AdyenComponent
        controller={fakeController('controller-style')}
        testID="card-view"
        style={{ marginTop: 8 }}
      />
    );

    expect(capturedProps.testID).toBe('card-view');
    expect(capturedProps.style).toEqual([
      expect.objectContaining({ width: '100%' }),
      { marginTop: 8 },
      { height: undefined },
    ]);
  });

  test('rebinds when the controller changes', () => {
    const { rerender } = render(
      <AdyenComponent controller={fakeController('controller-a')} />
    );
    expect(capturedProps.controllerId).toBe('controller-a');

    rerender(<AdyenComponent controller={fakeController('controller-b')} />);

    expect(capturedProps.controllerId).toBe('controller-b');
  });

  test('renders nothing for a controller without UI', () => {
    const { queryByTestId } = render(
      <AdyenComponent controller={fakeController('headless', false)} />
    );

    expect(queryByTestId('native-adyen-view')).toBeNull();
  });

  test('renders nothing for a controller that did not originate from a checkout', () => {
    const foreign = {
      paymentMethod: { id: 'pm', type: 'scheme', name: 'Card' },
      requiresUserInteraction: true,
      submit: jest.fn(),
    } as unknown as Controller;

    const { queryByTestId } = render(<AdyenComponent controller={foreign} />);

    expect(queryByTestId('native-adyen-view')).toBeNull();
  });
});
