import React, { createRef } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { CardView, type CardViewHandle } from '../CardView';

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockSubmit = jest.fn();
let mockPaymentMethods:
  { paymentMethods: { type: string; name: string }[] } | undefined;
let mockSubmissionAvailabilityListener:
  ((isAvailable: boolean) => void) | undefined;

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
    addSubmissionAvailabilityListener: (
      _viewId: string,
      listener: (isAvailable: boolean) => void
    ) => {
      mockSubmissionAvailabilityListener = listener;
      return () => {
        if (mockSubmissionAvailabilityListener === listener) {
          mockSubmissionAvailabilityListener = undefined;
        }
      };
    },
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
    mockSubmissionAvailabilityListener = undefined;
  });

  test('submits through the embedded component bus once ready', () => {
    const ref = createRef<CardViewHandle>();
    const onReadyChange = jest.fn();
    const { getByTestId } = render(
      <CardView ref={ref} onReadyChange={onReadyChange} />
    );

    expect(ref.current?.submit()).toBe(false);
    expect(mockSubmit).not.toHaveBeenCalled();

    fireEvent(getByTestId('native-card-view'), 'layoutChange', {
      nativeEvent: { height: 120, width: 320 },
    });

    expect(onReadyChange).toHaveBeenLastCalledWith(true);
    expect(ref.current?.submit()).toBe(true);
    expect(mockSubmit).toHaveBeenCalledWith('42');
  });

  test('stops reporting ready after successful native cleanup', () => {
    const ref = createRef<CardViewHandle>();
    const onReadyChange = jest.fn();
    const { getByTestId } = render(
      <CardView ref={ref} onReadyChange={onReadyChange} />
    );
    fireEvent(getByTestId('native-card-view'), 'layoutChange', {
      nativeEvent: { height: 120, width: 320 },
    });

    act(() => mockSubmissionAvailabilityListener?.(false));

    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(ref.current?.submit()).toBe(false);
  });

  test('does not reuse layout readiness after the native view remounts', () => {
    const ref = createRef<CardViewHandle>();
    const onReadyChange = jest.fn();
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const { getByTestId, rerender } = render(
      <CardView ref={ref} onReadyChange={onReadyChange} />
    );
    fireEvent(getByTestId('native-card-view'), 'layoutChange', {
      nativeEvent: { height: 120, width: 320 },
    });
    expect(ref.current?.submit()).toBe(true);

    mockPaymentMethods = undefined;
    rerender(<CardView ref={ref} onReadyChange={onReadyChange} />);
    expect(ref.current?.submit()).toBe(false);

    mockPaymentMethods = {
      paymentMethods: [{ type: 'scheme', name: 'Credit card' }],
    };
    rerender(<CardView ref={ref} onReadyChange={onReadyChange} />);

    expect(ref.current?.submit()).toBe(false);
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    consoleError.mockRestore();
  });

  test('reports not ready and unsubscribes when unmounted', () => {
    const onReadyChange = jest.fn();
    const { getByTestId, unmount } = render(
      <CardView onReadyChange={onReadyChange} />
    );

    fireEvent(getByTestId('native-card-view'), 'layoutChange', {
      nativeEvent: { height: 120, width: 320 },
    });

    act(unmount);

    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(mockUnsubscribe).toHaveBeenCalledWith('42');
  });
});
