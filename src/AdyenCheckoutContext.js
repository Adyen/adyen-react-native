import React, { useRef, useCallback, createContext } from 'react';
import {
  PAYMENT_SUBMIT_EVENT,
  PAYMENT_PROVIDE_DETAILS_EVENT,
  PAYMENT_COMPLETED_EVENT,
  PAYMENT_FAILED_EVENT,
} from './AdyenCheckoutEvents';
import { getNativeComponent } from './AdyenNativeModules';
import { NativeEventEmitter } from 'react-native';

const AdyenCheckoutContext = createContext({
  start: () => {},
  config: {},
  paymentMethods: {},
});

const AdyenPaymentProvider = ({
  config,
  paymentMethods,
  onSubmit,
  onComplete,
  onFail,
  onProvide,
  children,
}) => {
  const onSubmitEventListener = useRef(null);
  const onProvideEventListener = useRef(null);
  const onCompleteEventListener = useRef(null);
  const onFailEventListener = useRef(null);

  const submitPayment = useCallback(
    (configuration, data, nativeComponent) => {
      const payload = {
        ...data,
        shopperLocale: configuration.shopperLocale,
        channel: configuration.channel,
        amount: configuration.amount,
        reference: configuration.reference,
        shopperReference: configuration.shopperReference,
        countryCode: configuration.countryCode,
        merchantAccount: configuration.merchantAccount,
        additionalData: configuration.additionalData,
        returnUrl: data.returnUrl ?? configuration.returnUrl,
      };
      onSubmit(payload, nativeComponent);
    },
    [onSubmit]
  );

  const removeEventListeners = useCallback(() => {
    onSubmitEventListener.current?.remove();
    onProvideEventListener.current?.remove();
    onCompleteEventListener.current?.remove();
    onFailEventListener.current?.remove();
  }, []);

  const startEventListeners = useCallback(
    (eventEmitter, configuration, nativeComponent) => {
      onSubmitEventListener.current = eventEmitter.addListener(
        PAYMENT_SUBMIT_EVENT,
        (data) => submitPayment(configuration, data, nativeComponent)
      );
      onProvideEventListener.current = eventEmitter.addListener(
        PAYMENT_PROVIDE_DETAILS_EVENT,
        (data) => onProvide(data, nativeComponent)
      );
      onCompleteEventListener.current = eventEmitter.addListener(
        PAYMENT_COMPLETED_EVENT,
        () => {
          removeEventListeners();
          onComplete(nativeComponent);
        }
      );
      onFailEventListener.current = eventEmitter.addListener(
        PAYMENT_FAILED_EVENT,
        (error) => {
          removeEventListeners();
          onFail(error, nativeComponent);
        }
      );
    },
    [submitPayment, removeEventListeners, onProvide, onComplete, onFail]
  );

  const start = useCallback(
    (nativeComponentName) => {
      removeEventListeners();
      const nativeComponent = getNativeComponent(nativeComponentName);
      const eventEmitter = new NativeEventEmitter(nativeComponent);
      startEventListeners(eventEmitter, config, nativeComponent);
      nativeComponent.open(paymentMethods, config);
    },
    [config, paymentMethods, startEventListeners, removeEventListeners]
  );

  return (
    <AdyenCheckoutContext.Provider value={{ start, config, paymentMethods }}>
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContext, AdyenPaymentProvider };
