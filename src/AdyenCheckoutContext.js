// @ts-check

import React, { useRef, useCallback, createContext, useEffect } from 'react';
import { Event } from './constants';
import { getNativeComponent } from './AdyenNativeModules';
import { NativeEventEmitter } from 'react-native';

const AdyenCheckoutContext = createContext({
  start: (/** @type {string} */ typeName) => {},
  config: {},
  /** @type {import('./AdyenNativeModules').PaymentMethodsResponse=} */
  paymentMethods: undefined,
});

/**
 * Event callback, called when the shopper selects the Pay button and payment details are valid.
 * @callback OnSubmitFunction
 * @param {*}  data Payment details collected by component. Your server should use it to make the Adyen API `/payments` request.
 * @param {import('./AdyenNativeModules').AdyenComponent & import('./AdyenNativeModules').AdyenActionComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 * Event callback, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods.
 * @callback OnAdditionalDetailsFunction
 * @param {*} data Additional payment challenge details.
 * @param {import('./AdyenNativeModules').AdyenComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 * Event callback, called when a shopper finishes the flow (Voucher payments only).
 * @callback OnCompletedFunction
 * @param {import('./AdyenNativeModules').AdyenComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 * Event callback, called when payment about to be terminate.
 * @callback OnErrorFunction
 * @param {{ message: string; errorCode: string; }} error Reason for payment termination.
 * @param {import('./AdyenNativeModules').AdyenComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 * @typedef {Object} AdyenCheckoutProp
 * @property {*} config Collection of all necessary configurations
 * @property {import('./AdyenNativeModules').PaymentMethodsResponse } paymentMethods JSON response from Adyen API `\paymentMethods`
 * @property {OnSubmitFunction} onSubmit Event callback, called when the shopper selects the Pay button and payment details are valid.
 * @property {OnAdditionalDetailsFunction=} onAdditionalDetails Event callback, called when a payment method requires more details, for example for native 3D Secure 2, or native QR code payment methods.
 * @property {OnCompletedFunction=} onComplete Event callback, called when a shopper finishes the flow (Voucher payments only).
 * @property {OnErrorFunction=} onError Event callback, called when payment about to be terminate.
 * 
 * @property {OnAdditionalDetailsFunction=} onProvide Deprecated, use 'onAdditionalDetails' instead.
 * @property {OnErrorFunction=} onFail Deprecated, use 'onError' instead.

 * @property {React.ReactNode} children Inline elements.
 */

/** @param {AdyenCheckoutProp} props */
const AdyenCheckout = (props) => {
  /** @type {import('react').MutableRefObject<import('react-native').EventSubscription[]>} */
  const subscriptions = useRef([]);
  const { config, paymentMethods, onSubmit, onComplete, children } = props;

  const onError = props.onError == undefined ? props.onFail : props.onError;
  const onAdditionalDetails =
    props.onAdditionalDetails == undefined
      ? props.onProvide
      : props.onAdditionalDetails;

  useEffect(() => {
    return () => {
      removeEventListeners();
    };
  }, []);

  const submitPayment = useCallback(
    (
      /** @type {{ returnUrl: any; }} */ configuration,
      /** @type {{ returnUrl: any; }} */ data,
      /** @type {any} */ nativeComponent
    ) => {
      const payload = {
        ...data,
        returnUrl: data.returnUrl ?? configuration.returnUrl,
      };
      onSubmit(payload, nativeComponent);
    },
    [onSubmit]
  );

  const removeEventListeners = useCallback(() => {
    subscriptions.current.forEach((s) => s.remove());
  }, [subscriptions]);

  const startEventListeners = useCallback(
    (
      /** @type {any} */ configuration,
      /** @type {import("react-native").NativeModule & import('./AdyenNativeModules').AdyenComponent} */ nativeComponent
    ) => {
      const eventEmitter = new NativeEventEmitter(nativeComponent);
      subscriptions.current = [
        eventEmitter.addListener(Event.onSubmit, (data) =>
          submitPayment(configuration, data, nativeComponent)
        ),
        eventEmitter.addListener(Event.onAdditionalDetails, (data) =>
          onAdditionalDetails?.(data, nativeComponent)
        ),
        eventEmitter.addListener(Event.onComplete, () => {
          onComplete?.(nativeComponent);
        }),
        eventEmitter.addListener(Event.onError, (error) => {
          onError?.(error, nativeComponent);
        }),
      ];
    },
    [
      submitPayment,
      removeEventListeners,
      onAdditionalDetails,
      onComplete,
      onError,
      subscriptions,
    ]
  );

  const start = useCallback(
    (/** @type {string} */ nativeComponentName) => {
      removeEventListeners();
      const { nativeComponent, paymentMethod } = getNativeComponent(
        nativeComponentName,
        paymentMethods
      );

      startEventListeners(config, nativeComponent);

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
    <AdyenCheckoutContext.Provider
      value={{
        start,
        config,
        paymentMethods,
      }}
    >
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContext, AdyenCheckout };
