import React, { createRef } from 'react';
import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { CardView, type CardViewHandle } from '../CardView';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSubmit = jest.fn();
let mockPaymentMethods:
  { paymentMethods: { type: string; name: string }[] } | undefined;

jest.mock('../../hooks/useAdyenCheckout', () => ({
  useAdyenCheckout: () => ({
    config: { environment: 'test', clientKey: 'test_key' },
    paymentMethods: mockPaymentMethods,
  }),
}));

jest.mock('../../hooks/useComponent', () => ({
  useComponent: () => ({
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
  }),
}));

jest.mock('../../modules/embedded/EmbeddedComponentBus', () => ({
  EmbeddedComponentBus: {
    submit: (viewId: string) => mockSubmit(viewId),
  },
}));

jest.mock('../../specs/NativeCardView', () => ({
  __esModule: true,
  default: (() => {
    const ReactModule = require('react');
    const { View } = require('react-native');

    return ReactModule.forwardRef(function MockNativeCardView(
      props: object,
      ref: React.Ref<number>
    ) {
      ReactModule.useImperativeHandle(ref, () => 42);
      return ReactModule.createElement(View, {
        testID: 'native-card-view',
        ...props,
      });
    });
  })(),
}));

describe('CardView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPaymentMethods = {
      paymentMethods: [{ type: 'scheme', name: 'Credit card' }],
    };
  });

  test('submits through the embedded component bus', () => {
    const ref = createRef<CardViewHandle>();
    render(<CardView ref={ref} />);

    ref.current?.submit();
    expect(mockSubmit).toHaveBeenCalledWith('42');
  });

  test('ignores submission when the native view is unavailable', () => {
    const ref = createRef<CardViewHandle>();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    mockPaymentMethods = undefined;
    render(<CardView ref={ref} />);

    ref.current?.submit();

    expect(mockSubmit).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  test('unsubscribes when unmounted', () => {
    const { unmount } = render(<CardView />);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledWith('42');
  });
});
