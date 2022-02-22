import React, { useRef, useCallback, createContext } from 'react';
import { NativeEventEmitter } from 'react-native';
import { 
  PAYMENT_SUBMIT_EVENT, 
  PAYMENT_PROVIDE_DETAILS_EVENT, 
  PAYMENT_COMPLETED_EVENT, 
  PAYMENT_FAILED_EVENT 
} from './AdyenCheckoutEvents';

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
    (nativeComponent, paymentMethods, configuration) => {
      removeEventListeners();

      const eventEmitter = new NativeEventEmitter(nativeComponent);
      onSubmitEventListener.current = eventEmitter.addListener(
        PAYMENT_SUBMIT_EVENT,
        (data) => submitPayment(configuration, data)
      );
      onProvideEventListener.current = eventEmitter.addListener(
        PAYMENT_PROVIDE_DETAILS_EVENT,
        props.onProvide
      );
      onCompleteEventListener.current = eventEmitter.addListener(
        PAYMENT_COMPLETED_EVENT,
        () => {
          removeEventListeners();
          props.onComplete();
        }
      );
      onFailEventListener.current = eventEmitter.addListener(
        PAYMENT_FAILED_EVENT,
        (error) => {
          removeEventListeners();
          props.onFail(error);
        }
      );

      nativeComponent.open(paymentMethods, configuration);
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
