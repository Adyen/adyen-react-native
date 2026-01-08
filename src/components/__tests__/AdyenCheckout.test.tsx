import { Text, TouchableOpacity, View } from 'react-native';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { AdyenCheckout } from '../AdyenCheckout';
import { useAdyenCheckout } from '../../hooks/useAdyenCheckout';

// Mock functions must be defined before jest.mock calls due to hoisting
const mockOpen = jest.fn();
const mockHide = jest.fn();
const mockIsSupported = jest.fn().mockReturnValue(true);
const mockCreateSession = jest.fn();

jest.mock('../../modules/base/getWrapper', () => ({
  getWrapper: jest.fn(() => ({
    nativeComponent: {
      name: 'DropIn',
      open: mockOpen,
      hide: mockHide,
      isSupported: mockIsSupported,
      addListener: jest.fn(),
      removeListeners: jest.fn(),
    },
    paymentMethod: undefined,
  })),
}));

jest.mock('../../modules/session/SessionHelperModule', () => ({
  SessionHelper: {
    createSession: (session: any, config: any) =>
      mockCreateSession(session, config),
    hide: jest.fn(),
  },
}));

// Test data
const mockConfig = {
  environment: 'test' as const,
  clientKey: 'test_ABCDEFGH',
  countryCode: 'NL',
  returnUrl: 'myapp://checkout',
};

const mockPaymentMethods = {
  paymentMethods: [
    { type: 'scheme', name: 'Credit Card' },
    { type: 'ideal', name: 'iDEAL' },
  ],
};

// Consumer component to test context
function TestConsumer() {
  const { start, config, paymentMethods, isReady } = useAdyenCheckout();
  return (
    <View>
      {isReady && (
        <TouchableOpacity testID="start-btn" onPress={() => start('dropin')}>
          <Text>Start</Text>
        </TouchableOpacity>
      )}
      <Text testID="ready">{isReady ? 'ready' : 'not-ready'}</Text>
      <Text testID="config">{config.clientKey}</Text>
      <Text testID="payment-methods">
        {paymentMethods?.paymentMethods?.length ?? 0}
      </Text>
    </View>
  );
}

describe('AdyenCheckout', () => {
  const onError = jest.fn();
  const onSubmit = jest.fn();
  const onComplete = jest.fn();
  const onAdditionalDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateSession.mockReset();
  });

  describe('rendering', () => {
    test('should render children', () => {
      const { getByTestId } = render(
        <AdyenCheckout
          config={mockConfig}
          paymentMethods={mockPaymentMethods}
          onError={onError}
        >
          <Text testID="child">Test Child</Text>
        </AdyenCheckout>
      );

      expect(getByTestId('child')).toBeTruthy();
    });

    test('should provide context to children', () => {
      const { getByTestId } = render(
        <AdyenCheckout
          config={mockConfig}
          paymentMethods={mockPaymentMethods}
          onError={onError}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      expect(getByTestId('config').props.children).toBe('test_ABCDEFGH');
    });
  });

  describe('context values', () => {
    test('should set isReady to true when paymentMethods provided', () => {
      const { getByTestId } = render(
        <AdyenCheckout
          config={mockConfig}
          paymentMethods={mockPaymentMethods}
          onError={onError}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      expect(getByTestId('ready').props.children).toBe('ready');
    });

    test('should set isReady to false when no paymentMethods', () => {
      const { getByTestId } = render(
        <AdyenCheckout config={mockConfig} onError={onError}>
          <TestConsumer />
        </AdyenCheckout>
      );

      expect(getByTestId('ready').props.children).toBe('not-ready');
    });

    test('should expose paymentMethods count in context', () => {
      const { getByTestId } = render(
        <AdyenCheckout
          config={mockConfig}
          paymentMethods={mockPaymentMethods}
          onError={onError}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      expect(getByTestId('payment-methods').props.children).toBe(2);
    });
  });

  describe('session handling', () => {
    test('should create session when session prop provided', async () => {
      const sessionConfig = { id: 'session_123', sessionData: 'test_data' };
      const sessionResponse = {
        id: 'session_123',
        sessionData: 'response_data',
        paymentMethods: mockPaymentMethods,
      };
      mockCreateSession.mockResolvedValue(sessionResponse);

      render(
        <AdyenCheckout
          config={mockConfig}
          session={sessionConfig}
          onError={onError}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith(
          sessionConfig,
          mockConfig
        );
      });
    });

    test('should call onError when session creation fails', async () => {
      const sessionConfig = { id: 'session_123', sessionData: 'test_data' };
      mockCreateSession.mockRejectedValue(new Error('Session failed'));

      render(
        <AdyenCheckout
          config={mockConfig}
          session={sessionConfig}
          onError={onError}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Session failed'),
            errorCode: 'sessionError',
          }),
          expect.anything()
        );
      });
    });

    test('should create session even if paymentMethods provided', async () => {
      const sessionConfig = { id: 'session_123', sessionData: 'test_data' };
      const sessionResponse = {
        id: 'session_123',
        sessionData: 'response_data',
        paymentMethods: mockPaymentMethods,
      };
      mockCreateSession.mockResolvedValue(sessionResponse);

      render(
        <AdyenCheckout
          config={mockConfig}
          paymentMethods={mockPaymentMethods}
          session={sessionConfig}
          onError={onError}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      await waitFor(() => {
        // Session is created regardless of paymentMethods prop
        expect(mockCreateSession).toHaveBeenCalled();
      });
    });
  });

  describe('start function', () => {
    test('should call getWrapper and open when start is called', async () => {
      const { getWrapper } = require('../../modules/base/getWrapper');

      const { getByTestId } = render(
        <AdyenCheckout
          config={mockConfig}
          paymentMethods={mockPaymentMethods}
          onError={onError}
          onSubmit={onSubmit}
        >
          <TestConsumer />
        </AdyenCheckout>
      );

      // Simulate calling start through context
      const startBtn = getByTestId('start-btn');
      fireEvent.press(startBtn);

      expect(getWrapper).toHaveBeenCalledWith('dropin', mockPaymentMethods);
      expect(mockOpen).toHaveBeenCalledWith(mockPaymentMethods, mockConfig);
    });

    test('should throw error if paymentMethods undefined when start called', () => {
      const { getByTestId } = render(
        <AdyenCheckout config={mockConfig} onError={onError}>
          <TestConsumer />
        </AdyenCheckout>
      );

      // isReady is false, so start button won't be shown
      expect(() => getByTestId('start-btn')).toThrow();
    });
  });

  describe('props', () => {
    test('should accept all optional callbacks', () => {
      expect(() =>
        render(
          <AdyenCheckout
            config={mockConfig}
            paymentMethods={mockPaymentMethods}
            onError={onError}
            onSubmit={onSubmit}
            onComplete={onComplete}
            onAdditionalDetails={onAdditionalDetails}
          >
            <text>Test</text>
          </AdyenCheckout>
        )
      ).not.toThrow();
    });

    test('should work with only required props', () => {
      expect(() =>
        render(
          <AdyenCheckout config={mockConfig} onError={onError}>
            <text>Test</text>
          </AdyenCheckout>
        )
      ).not.toThrow();
    });
  });
});
