import React, { useRef, useCallback, createContext, useEffect } from 'react';
import { Event } from './constants';
import { getNativeComponent } from './AdyenNativeModules';
import { NativeEventEmitter } from 'react-native';

const AdyenCheckoutContext = createContext({
  start: () => {},
  config: {},
  paymentMethods: {},
});

const AdyenCheckout = ({
  config,
  paymentMethods,
  onSubmit,
  onComplete,
  onFail,
  onProvide,
  children,
}) => {
  const subscriptions = useRef([]);

  useEffect(() => {
    return () => {
      removeEventListeners();
    };
  }, []);

  const submitPayment = useCallback(
    (configuration, data, nativeComponent) => {
      const payload = {
        ...data,
        returnUrl: data.returnUrl ?? configuration.returnUrl,
      };
      onSubmit(payload, nativeComponent);
    },
    [onSubmit]
  );

  const removeEventListeners = useCallback(() => {
    subscriptions.current.forEach((s) => s?.remove?.());
  }, [subscriptions]);

  const startEventListeners = useCallback(
    (eventEmitter, configuration, nativeComponent) => {
      subscriptions.current = [
        eventEmitter.addListener(Event.OnSubmit, (data) =>
          submitPayment(configuration, data, nativeComponent)
        ),
        eventEmitter.addListener(Event.OnProvide, (data) =>
          onProvide(data, nativeComponent)
        ),
        eventEmitter.addListener(Event.onComplete, () => {
          onComplete(nativeComponent);
        }),
        eventEmitter.addListener(Event.onFail, (error) => {
          onFail(error, nativeComponent);
        }),
      ];
    },
    [
      submitPayment,
      removeEventListeners,
      onProvide,
      onComplete,
      onFail,
      subscriptions,
    ]
  );

  const start = useCallback(
    (nativeComponentName) => {
      removeEventListeners();
      const { nativeComponent, paymentMethod } = getNativeComponent(
        nativeComponentName,
        paymentMethods
      );

      const eventEmitter = new NativeEventEmitter(nativeComponent);
      startEventListeners(eventEmitter, config, nativeComponent);

      if (paymentMethod) {
        const singlePaymentMethods = { paymentMethods: [paymentMethod] };
        const singlePaymentConfig = {
          ...config,
          dropin: { skipListWhenSinglePaymentMethod: true },
        };
        nativeComponent.open(singlePaymentMethods, singlePaymentConfig);
      } else {
        nativeComponent.open(paymentMethods, config);
      }
    },
    [config, paymentMethods, startEventListeners, removeEventListeners]
  );

  return (
    <AdyenCheckoutContext.Provider value={{ start, config, paymentMethods }}>
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContext, AdyenCheckout };
