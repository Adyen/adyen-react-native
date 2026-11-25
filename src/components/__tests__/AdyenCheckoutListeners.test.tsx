import { DeviceEventEmitter, Text, TouchableOpacity, View } from 'react-native';
import { describe, expect, test, jest, afterEach } from '@jest/globals';
import { render, fireEvent } from '@testing-library/react-native';
import { AdyenCheckout } from '../AdyenCheckout';
import { useAdyenCheckout } from '../../hooks/useAdyenCheckout';
import { Event } from '../../core/constants';

function mockNativeComponent(name: string) {
  return {
    name,
    open: jest.fn(),
    hide: jest.fn(),
    isSupported: (event: string) => event === 'didSubmitCallback',
    eventEmitterTarget: {
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
  };
}

const mockApplePay = mockNativeComponent('AdyenApplePay');
const mockDropIn = mockNativeComponent('AdyenDropIn');

jest.mock('../../modules/base/getWrapper', () => ({
  getWrapper: jest.fn((typeName: string) => ({
    nativeComponent: typeName === 'applepay' ? mockApplePay : mockDropIn,
    paymentMethod: undefined,
  })),
}));

jest.mock('../../modules/embedded/EmbeddedComponentBus', () => ({
  EmbeddedComponentBus: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

jest.mock('../../modules/session/SessionHelperModule', () => ({
  SessionHelper: {
    hide: jest.fn(),
    removeAllListeners: jest.fn(),
    assignCompletionHandler: jest.fn(),
    assignErrorHandler: jest.fn(),
  },
}));

const config = {
  environment: 'test' as const,
  clientKey: 'test_ABCDEFGH',
  countryCode: 'NL',
  returnUrl: 'myapp://checkout',
};

const paymentMethods = {
  paymentMethods: [{ type: 'scheme', name: 'Credit Card' }],
};

function emitSubmit() {
  DeviceEventEmitter.emit(Event.onSubmit, {
    paymentData: { paymentMethod: { type: 'scheme' } },
  });
}

function PaymentButtons() {
  const { start } = useAdyenCheckout();
  return (
    <View>
      <TouchableOpacity testID="apple-pay" onPress={() => start('applepay')}>
        <Text>Apple Pay</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="drop-in" onPress={() => start('dropin')}>
        <Text>Drop-in</Text>
      </TouchableOpacity>
    </View>
  );
}

describe('AdyenCheckout event listeners', () => {
  afterEach(() => {
    DeviceEventEmitter.removeAllListeners(Event.onSubmit);
  });

  test('calls onSubmit once after the shopper switches to another payment component', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <AdyenCheckout
        config={config}
        paymentMethods={paymentMethods}
        onSubmit={onSubmit}
        onError={jest.fn()}
      >
        <PaymentButtons />
      </AdyenCheckout>
    );

    fireEvent.press(getByTestId('apple-pay'));
    fireEvent.press(getByTestId('drop-in'));
    emitSubmit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.anything(),
      mockDropIn,
      undefined
    );
  });

  test('calls onSubmit once after the shopper reopens the same payment component', () => {
    const onSubmit = jest.fn();
    const { getByTestId } = render(
      <AdyenCheckout
        config={config}
        paymentMethods={paymentMethods}
        onSubmit={onSubmit}
        onError={jest.fn()}
      >
        <PaymentButtons />
      </AdyenCheckout>
    );

    fireEvent.press(getByTestId('drop-in'));
    fireEvent.press(getByTestId('drop-in'));
    emitSubmit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('removes the listeners when AdyenCheckout unmounts', () => {
    const onSubmit = jest.fn();
    const { getByTestId, unmount } = render(
      <AdyenCheckout
        config={config}
        paymentMethods={paymentMethods}
        onSubmit={onSubmit}
        onError={jest.fn()}
      >
        <PaymentButtons />
      </AdyenCheckout>
    );

    fireEvent.press(getByTestId('apple-pay'));
    fireEvent.press(getByTestId('drop-in'));
    unmount();
    emitSubmit();

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
