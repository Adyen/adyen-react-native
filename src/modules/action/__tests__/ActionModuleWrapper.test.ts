import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { ActionModuleWrapper } from '../ActionModuleWrapper';

function createMockActionNativeModule() {
  return {
    handle: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('{"resultCode":"Authorised"}'),
    hide: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getThreeDS2SdkVersion: jest
      .fn<() => Promise<string>>()
      .mockResolvedValue('2.2.0'),
  };
}

describe('ActionModuleWrapper', () => {
  let nativeModule: ReturnType<typeof createMockActionNativeModule>;

  beforeEach(() => {
    nativeModule = createMockActionNativeModule();
  });

  test('serializes handle payloads and parses the generated response', async () => {
    const wrapper = new ActionModuleWrapper(nativeModule);
    const action = { type: 'threeDS2', paymentMethodType: 'scheme' };
    const configuration = {
      environment: 'test' as const,
      clientKey: 'test_key',
      returnUrl: 'myapp://action/payment',
    };

    await expect(wrapper.handle(action, configuration)).resolves.toEqual({
      resultCode: 'Authorised',
    });
    expect(nativeModule.handle).toHaveBeenCalledWith(
      JSON.stringify(action),
      JSON.stringify(configuration)
    );
  });

  test('propagates a handle rejection without converting it to a no-op', async () => {
    nativeModule.handle.mockRejectedValueOnce(new Error('actionBusy'));
    const wrapper = new ActionModuleWrapper(nativeModule);

    await expect(
      wrapper.handle(
        { type: 'threeDS2', paymentMethodType: 'scheme' },
        {
          environment: 'test' as const,
          clientKey: 'test_key',
          returnUrl: 'myapp://action/payment',
        }
      )
    ).rejects.toThrow('actionBusy');
  });

  test('normalizes token-free RedirectAction capability rejection with presentation metadata', async () => {
    nativeModule.handle.mockRejectedValueOnce({
      code: 'unsupportedCapability',
    });
    const wrapper = new ActionModuleWrapper(nativeModule);
    const action = {
      type: 'redirect',
      paymentMethodType: 'ideal',
      url: 'https://issuer.example/redirect?opaque=provider-value',
    };

    await expect(
      wrapper.handle(action, {
        environment: 'test' as const,
        clientKey: 'test_key',
        returnUrl: 'myapp://action/payment',
      })
    ).rejects.toEqual({
      code: 'unsupportedCapability',
      phase: 'presentation',
    });
    expect(JSON.parse(nativeModule.handle.mock.calls[0][0])).toEqual(action);
  });

  test('keeps each generated handle promise bound to its own native result', async () => {
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    nativeModule.handle
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );
    const wrapper = new ActionModuleWrapper(nativeModule);
    const configuration = {
      environment: 'test' as const,
      clientKey: 'test_key',
      returnUrl: 'myapp://action/payment',
    };
    const first = wrapper.handle(
      { type: 'threeDS2', paymentMethodType: 'scheme' },
      configuration
    );
    const second = wrapper.handle(
      { type: 'threeDS2', paymentMethodType: 'scheme' },
      configuration
    );

    resolveSecond('{"resultCode":"Second"}');
    await expect(second).resolves.toEqual({ resultCode: 'Second' });
    resolveFirst('{"resultCode":"First"}');
    await expect(first).resolves.toEqual({ resultCode: 'First' });
  });

  test('uses the generated asynchronous cancellation command', async () => {
    const wrapper = new ActionModuleWrapper(nativeModule);

    await expect(wrapper.hide()).resolves.toBeUndefined();
    expect(nativeModule.hide).toHaveBeenCalledWith();
  });

  test('reads the 3DS2 SDK version through the generated module', async () => {
    const wrapper = new ActionModuleWrapper(nativeModule);

    await expect(wrapper.getThreeDS2SdkVersion()).resolves.toBe('2.2.0');
    expect(nativeModule.getThreeDS2SdkVersion).toHaveBeenCalledWith();
  });
});
