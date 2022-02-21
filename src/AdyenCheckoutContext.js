import React, { useRef, useCallback, createContext } from 'react';

const AdyenCheckoutContext = createContext({
  start: () => {},
});

const AdyenPaymentProvider = ({ onSubmit, onComplete, onFail, onProvide }) => {
  const onSubmitEventListener = useRef(null);
  const onProvideEventListener = useRef(null);
  const onCompleteEventListener = useRef(null);
  const onFailEventListener = useRef(null);

  const removeEventListeners = useCallback(() => {
    onSubmitEventListener.current?.remove();
    onProvideEventListener.current?.remove();
    onCompleteEventListener.current?.remove();
    onFailEventListener.current?.remove();
  },[]);

  const submitPayment = useCallback((configuration, data) => {
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
    onSubmit(payload);
  }, [onSubmit]);


  const startPaymentMethod = useCallback((eventEmitter, configuration) => {
    removeEventListeners();

    onSubmitEventListener.current = eventEmitter.addListener('didSubmitCallback', (data) => submitPayment(configuration, data));
    onProvideEventListener.current = eventEmitter.addListener('didProvideCallback', onProvide);
    onCompleteEventListener.current =  eventEmitter.addListener('didCompleteCallback', () => {
      removeEventListeners();
      onComplete();
    });
    onFailEventListener.current = eventEmitter.addListener('didFailCallback', (error) => {
      removeEventListeners();
      onFail(error);
    });

  }, [submitPayment, removeEventListeners, onProvide, onComplete, onFail]);


  return (
    <AdyenCheckoutContext.Provider value={{ start: startPaymentMethod }}>
      <AdyenCheckoutContext.Consumer>
        {this.props.children}
      </AdyenCheckoutContext.Consumer>
    </AdyenCheckoutContext.Provider>
  );
}

export { AdyenCheckoutContext, AdyenPaymentProvider }