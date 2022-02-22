import React, { useRef, useCallback, createContext } from 'react';
import { onPaymentSubmitedEvent, onPaymentDetailsProvidedEvent, onPaymentCompletedEvent, onPaymentFailed } from './AdyenCheckoutEvents';

const AdyenCheckoutContext = createContext({
  start: () => {},
});

const AdyenPaymentProvider = (props) => {
  const onSubmitEventListener = useRef(null);
  const onProvideEventListener = useRef(null);
  const onCompleteEventListener = useRef(null);
  const onFailEventListener = useRef(null);

  const removeEventListeners = useCallback(() => {
    onSubmitEventListener.current?.remove();
    onProvideEventListener.current?.remove();
    onCompleteEventListener.current?.remove();
    onFailEventListener.current?.remove();
  }, []);

  const submitPayment = useCallback(
    (configuration, data) => {
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
      props.onSubmit(payload);
    },
    [props]
  );

  const startPaymentMethod = useCallback(
    (eventEmitter, configuration) => {
      removeEventListeners();

      onSubmitEventListener.current = eventEmitter.addListener(
        onPaymentSubmitedEvent,
        (data) => submitPayment(configuration, data)
      );
      onProvideEventListener.current = eventEmitter.addListener(
        onPaymentDetailsProvidedEvent,
        props.onProvide
      );
      onCompleteEventListener.current = eventEmitter.addListener(
        onPaymentCompletedEvent,
        () => {
          removeEventListeners();
          props.onComplete();
        }
      );
      onFailEventListener.current = eventEmitter.addListener(
        onPaymentFailed,
        (error) => {
          removeEventListeners();
          props.onFail(error);
        }
      );
    },
    [submitPayment, removeEventListeners, props]
  );

  return (
    <AdyenCheckoutContext.Provider value={{ start: startPaymentMethod }}>
      <AdyenCheckoutContext.Consumer>
        {props.children}
      </AdyenCheckoutContext.Consumer>
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContext, AdyenPaymentProvider };
