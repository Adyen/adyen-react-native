//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// Untyped mocks: these tests drive the bridge and the demo server with arbitrary payloads.
type AnyFn = (...args: any[]) => any;

// The example workspace installs its own React and React Native copies; the renderer runs on the
// repository root copies, so the example module paths are pointed at those.
jest.mock('react', () =>
  jest.requireActual('../../../../../node_modules/react')
);
jest.mock('react/jsx-runtime', () =>
  jest.requireActual('../../../../../node_modules/react/jsx-runtime')
);
jest.mock('react-native', () =>
  jest.requireActual('../../../../../node_modules/react-native')
);

jest.mock('../../../../../src/specs/NativeAdyenCheckout', () => ({
  __esModule: true,
  default: {
    setupSession: jest.fn(),
    setupAdvanced: jest.fn(),
    isAvailable: jest.fn(),
    createController: jest.fn(),
    submitController: jest.fn(),
    invalidate: jest.fn(),
    respond: jest.fn(),
    startDropIn: jest.fn(),
    onCheckoutEvent: jest.fn(() => ({ remove: () => undefined })),
  },
}));

// The real JS checkout layer runs against the mocked bridge, so global replacement and stale
// handles behave exactly as in the app.
jest.mock(
  '@adyen/react-native',
  () => ({
    ...jest.requireActual<object>('../../../../../src/checkout'),
    ResultCode: jest.requireActual<{ ResultCode: object }>(
      '../../../../../src/core/constants'
    ).ResultCode,
    AdyenComponent: () => null,
  }),
  { virtual: true }
);

const mockAppContext = {
  advancedApi: {
    paymentMethods: jest.fn<AnyFn>(),
    payments: jest.fn<AnyFn>(),
    paymentDetails: jest.fn<AnyFn>(),
  },
  configuration: {},
  navigateToResults: jest.fn(),
};

jest.mock('../../../hooks/useAppContext', () => ({
  useAppContext: () => mockAppContext,
}));

jest.mock('../../../settings/checkoutConfiguration', () => ({
  checkoutConfiguration: () => ({
    environment: 'test',
    clientKey: 'test_ABCDEFGH',
    returnUrl: 'myapp://checkout',
  }),
}));

jest.mock('../../Checkout/components/PaymentMethodComponent', () => ({
  __esModule: true,
  default: () => null,
}));

import { AdyenCheckout } from '@adyen/react-native';
import CapabilityValidation from '../CapabilityValidation';

const native = jest.requireMock<{
  default: Record<string, jest.Mock<AnyFn>>;
}>('../../../../../src/specs/NativeAdyenCheckout').default;

const PAYMENT_METHODS_RESPONSE = {
  paymentMethods: [{ type: 'scheme', name: 'Card' }],
  storedPaymentMethods: [
    {
      id: 'stored-1111',
      type: 'scheme',
      name: 'Visa',
      lastFour: '1111',
      supportedShopperInteractions: ['Ecommerce'],
    },
  ],
};

const CALLBACKS = {
  onSubmit: jest.fn<AnyFn>(),
  onAdditionalDetails: jest.fn<AnyFn>(),
  onComplete: jest.fn<AnyFn>(),
  onError: jest.fn<AnyFn>(),
};

function descriptor(checkoutId: string) {
  return {
    checkoutId,
    flow: 'advanced',
    paymentMethodsJson: JSON.stringify({
      paymentMethods: [
        { id: `${checkoutId}-scheme`, type: 'scheme', name: 'Card' },
      ],
      storedPaymentMethods: PAYMENT_METHODS_RESPONSE.storedPaymentMethods,
    }),
  };
}

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

async function flush() {
  await act(async () => {
    for (let index = 0; index < 10; index += 1) await Promise.resolve();
  });
}

/** Simulates another screen installing its own checkout while the route request is pending. */
async function setupOtherScreenCheckout() {
  native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-other'));
  return AdyenCheckout.setupAdvanced(
    PAYMENT_METHODS_RESPONSE,
    {
      environment: 'test',
      clientKey: 'test_ABCDEFGH',
      returnUrl: 'myapp://checkout',
    },
    CALLBACKS
  );
}

async function expectHealthy(checkout: {
  createController: AnyFn;
  paymentMethods: any;
}) {
  const controller = await checkout.createController(
    checkout.paymentMethods.regular.first()
  );
  expect(controller.paymentMethod.id).toBe('checkout-other-scheme');
  expect(native.invalidate).not.toHaveBeenCalledWith('checkout-other');
}

describe('CapabilityValidation setup lifetime', () => {
  let checkoutCount = 0;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Release any checkout a previous test left active in the module-global registry.
    native.setupAdvanced.mockResolvedValueOnce(descriptor('checkout-reset'));
    native.invalidate.mockResolvedValue(undefined);
    const reset = await AdyenCheckout.setupAdvanced(
      PAYMENT_METHODS_RESPONSE,
      { environment: 'test', clientKey: 'test_ABCDEFGH', returnUrl: 'a://b' },
      CALLBACKS
    );
    await reset.invalidate();
    jest.clearAllMocks();
    native.invalidate.mockResolvedValue(undefined);
    native.isAvailable.mockResolvedValue(true);
    native.createController.mockImplementation(async (_checkoutId, id) => ({
      controllerId: `controller-${id}`,
      requiresUserInteraction: true,
    }));
    native.setupAdvanced.mockImplementation(async () => {
      checkoutCount += 1;
      return descriptor(`checkout-route-${checkoutCount}`);
    });
  });

  test('prepares the stored route and releases its checkout on exit', async () => {
    mockAppContext.advancedApi.paymentMethods.mockResolvedValue(
      PAYMENT_METHODS_RESPONSE
    );
    const view = render(
      <CapabilityValidation scenario="stored" onExit={jest.fn()} />
    );
    await flush();

    expect(
      screen.getByLabelText('validation-status-stored-store-ready')
    ).toBeTruthy();
    expect(screen.getByTestId('validation-mounted-0')).toBeTruthy();
    const routeCheckoutId = (await native.setupAdvanced.mock.results[0].value)
      .checkoutId;

    view.unmount();
    await flush();

    expect(native.invalidate).toHaveBeenCalledWith(routeCheckoutId);
  });

  test('a paymentMethods response arriving after exit cannot replace a newer checkout', async () => {
    const response = deferred<typeof PAYMENT_METHODS_RESPONSE>();
    mockAppContext.advancedApi.paymentMethods.mockReturnValueOnce(
      response.promise
    );
    const view = render(
      <CapabilityValidation scenario="multi-mount" onExit={jest.fn()} />
    );
    await flush();
    expect(screen.getByLabelText('validation-status-setting-up')).toBeTruthy();

    view.unmount();
    const other = await setupOtherScreenCheckout();
    response.resolve(PAYMENT_METHODS_RESPONSE);
    await flush();

    expect(native.setupAdvanced).toHaveBeenCalledTimes(1);
    await expectHealthy(other);
  });

  test('Load stored card responding after exit cannot replace a newer checkout', async () => {
    mockAppContext.advancedApi.paymentMethods.mockResolvedValueOnce(
      PAYMENT_METHODS_RESPONSE
    );
    const view = render(
      <CapabilityValidation scenario="stored" onExit={jest.fn()} />
    );
    await flush();
    expect(
      screen.getByLabelText('validation-status-stored-store-ready')
    ).toBeTruthy();

    const response = deferred<typeof PAYMENT_METHODS_RESPONSE>();
    mockAppContext.advancedApi.paymentMethods.mockReturnValueOnce(
      response.promise
    );
    fireEvent.press(screen.getByTestId('validation-stored-load'));
    await flush();
    expect(screen.getByLabelText('validation-status-setting-up')).toBeTruthy();

    view.unmount();
    native.setupAdvanced.mockClear();
    const other = await setupOtherScreenCheckout();
    response.resolve(PAYMENT_METHODS_RESPONSE);
    await flush();

    expect(native.setupAdvanced).toHaveBeenCalledTimes(1);
    await expectHealthy(other);
  });

  test('a checkout whose setup completes after exit is disposed immediately', async () => {
    mockAppContext.advancedApi.paymentMethods.mockResolvedValueOnce(
      PAYMENT_METHODS_RESPONSE
    );
    const nativeSetup = deferred<ReturnType<typeof descriptor>>();
    native.setupAdvanced.mockReturnValueOnce(nativeSetup.promise);
    const view = render(
      <CapabilityValidation scenario="giftcards" onExit={jest.fn()} />
    );
    await flush();
    expect(native.setupAdvanced).toHaveBeenCalledTimes(1);

    view.unmount();
    nativeSetup.resolve(descriptor('checkout-late'));
    await flush();

    expect(native.invalidate).toHaveBeenCalledWith('checkout-late');
    expect(native.isAvailable).not.toHaveBeenCalled();
    expect(native.createController).not.toHaveBeenCalled();

    const other = await setupOtherScreenCheckout();
    await expectHealthy(other);
  });
});
