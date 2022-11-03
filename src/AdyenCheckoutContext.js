import React, { useRef, useCallback, createContext, useEffect } from 'react';
import {
  PAYMENT_SUBMIT_EVENT,
  PAYMENT_PROVIDE_DETAILS_EVENT,
  PAYMENT_COMPLETED_EVENT,
  PAYMENT_FAILED_EVENT,
} from './constants';
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
    console.log('I am cleaning!');
  }, []);

  const startEventListeners = useCallback(
    (eventEmitter, configuration, nativeComponent) => {
      subscriptions.current = [
        eventEmitter.addListener(PAYMENT_SUBMIT_EVENT, (data) =>
          submitPayment(configuration, data, nativeComponent)
        ),
        eventEmitter.addListener(PAYMENT_PROVIDE_DETAILS_EVENT, (data) =>
          onProvide(data, nativeComponent)
        ),
        eventEmitter.addListener(PAYMENT_COMPLETED_EVENT, () => {
          removeEventListeners();
          onComplete(nativeComponent);
        }),
        eventEmitter.addListener(PAYMENT_FAILED_EVENT, (error) => {
          removeEventListeners();
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
