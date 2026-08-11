import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react-native';

// --------------------------------------------------------------------------
// Native module + collaborators are mocked so we can observe the
// subscribe/unsubscribe lifecycle in isolation.
// --------------------------------------------------------------------------

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../modules/component/AdyenComponentModule', () => ({
  AdyenComponent: {
    name: 'AdyenComponent',
    subscribe: (...args: any[]) => mockSubscribe(...args),
    unsubscribe: (...args: any[]) => mockUnsubscribe(...args),
  },
}));

const mockProxyCtor = jest.fn();
jest.mock('../../modules/component/ComponentProxy', () => ({
  ComponentProxy: class {
    constructor(...args: any[]) {
      mockProxyCtor(...args);
    }
  },
}));

// startEventListeners returns a fresh bag of removable subscriptions per call
// so each viewId owns its own listeners that we can assert are cleaned up.
const removeFns: Array<ReturnType<typeof jest.fn>> = [];
const mockStartEventListeners = jest.fn(() => {
  const remove = jest.fn();
  removeFns.push(remove);
  return [{ remove }];
});
jest.mock('../../components/utils/startEventListeners', () => ({
  startEventListeners: (...args: any[]) => mockStartEventListeners(...args),
}));

import { useSubscriptionManager } from '../useSubscriptionManager';

function createRefs() {
  return {
    onSubmit: { current: undefined },
    onError: { current: jest.fn() },
    onComplete: { current: undefined },
    onAdditionalDetails: { current: undefined },
    config: {
      current: {
        environment: 'test' as const,
        clientKey: 'test_key',
        returnUrl: 'app://checkout',
      },
    },
  } as any;
}

describe('useSubscriptionManager', () => {
  beforeEach(() => {
    mockSubscribe.mockClear();
    mockUnsubscribe.mockClear();
    mockProxyCtor.mockClear();
    mockStartEventListeners.mockClear();
    removeFns.length = 0;
  });

  describe('subscribe (view mount)', () => {
    test('subscribes the native module and attaches listeners for the viewId', () => {
      const refs = createRefs();
      const { result } = renderHook(() => useSubscriptionManager(refs));

      act(() => result.current.subscribe('view-1'));

      expect(mockSubscribe).toHaveBeenCalledWith('view-1');
      expect(mockProxyCtor).toHaveBeenCalledWith(expect.anything(), 'view-1');
      expect(mockStartEventListeners).toHaveBeenCalledTimes(1);
      // listeners are passed the proxy, the refs and the viewId
      expect(mockStartEventListeners).toHaveBeenCalledWith(
        expect.anything(),
        refs,
        'view-1'
      );
    });

    test('is idempotent — subscribing the same viewId twice subscribes once', () => {
      const refs = createRefs();
      const { result } = renderHook(() => useSubscriptionManager(refs));

      act(() => result.current.subscribe('view-1'));
      act(() => result.current.subscribe('view-1'));

      expect(mockSubscribe).toHaveBeenCalledTimes(1);
      expect(mockStartEventListeners).toHaveBeenCalledTimes(1);
    });

    test('subscribes independently for distinct viewIds', () => {
      const refs = createRefs();
      const { result } = renderHook(() => useSubscriptionManager(refs));

      act(() => result.current.subscribe('view-1'));
      act(() => result.current.subscribe('view-2'));

      expect(mockSubscribe).toHaveBeenNthCalledWith(1, 'view-1');
      expect(mockSubscribe).toHaveBeenNthCalledWith(2, 'view-2');
      expect(mockStartEventListeners).toHaveBeenCalledTimes(2);
    });
  });

  describe('unsubscribe (view unmount)', () => {
    test('removes the listeners and unsubscribes the native module', () => {
      const refs = createRefs();
      const { result } = renderHook(() => useSubscriptionManager(refs));

      act(() => result.current.subscribe('view-1'));
      act(() => result.current.unsubscribe('view-1'));

      expect(removeFns).toHaveLength(1);
      expect(removeFns[0]).toHaveBeenCalled();
      expect(mockUnsubscribe).toHaveBeenCalledWith('view-1');
    });

    test('unsubscribing an unknown viewId still forwards to native without throwing', () => {
      const refs = createRefs();
      const { result } = renderHook(() => useSubscriptionManager(refs));

      expect(() =>
        act(() => result.current.unsubscribe('never-subscribed'))
      ).not.toThrow();
      expect(mockUnsubscribe).toHaveBeenCalledWith('never-subscribed');
    });

    test('re-subscribing after unsubscribe attaches fresh listeners', () => {
      const refs = createRefs();
      const { result } = renderHook(() => useSubscriptionManager(refs));

      act(() => result.current.subscribe('view-1'));
      act(() => result.current.unsubscribe('view-1'));
      act(() => result.current.subscribe('view-1'));

      expect(mockSubscribe).toHaveBeenCalledTimes(2);
      expect(mockStartEventListeners).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup (provider unmount)', () => {
    test('removes all listeners and unsubscribes every active viewId', () => {
      const refs = createRefs();
      const { result, unmount } = renderHook(() =>
        useSubscriptionManager(refs)
      );

      act(() => result.current.subscribe('view-1'));
      act(() => result.current.subscribe('view-2'));

      unmount();

      expect(removeFns).toHaveLength(2);
      removeFns.forEach((remove) => expect(remove).toHaveBeenCalled());
      expect(mockUnsubscribe).toHaveBeenCalledWith('view-1');
      expect(mockUnsubscribe).toHaveBeenCalledWith('view-2');
    });
  });
});
