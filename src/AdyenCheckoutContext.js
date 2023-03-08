// @ts-check

import React, { useRef, useCallback, createContext, useEffect } from 'react';
import { Event } from './constants';
import {
  AdyenDropIn,
  // @ts-ignore
  AdyenComponent,
  getNativeComponent,
  // @ts-ignore
  PaymentMethodsResponse,
} from './AdyenNativeModules';
import { NativeEventEmitter } from 'react-native';

const AdyenCheckoutContext = createContext({
  start: (/** @type {string} */ typeName) => {},
  config: {},
  paymentMethods: /** @type {PaymentMethodsResponse=} */ undefined,
});

/**
 *
 * @callback OnSubmitFunction
 * @param {*}  data Payment details collected by component. Your server should use it to make the Adyen API `/payments` request.
 * @param {AdyenComponent & AdyenDropIn}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 *
 * @callback OnAdditionalDetailsFunction
 * @param {*} data Additional payment challenge details.
 * @param {AdyenComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 * @callback OnCompletedFunction
 * @param {AdyenComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 *
 * @callback OnErrorFunction
 * @param {{ message: string; errorCode: string; }} error Reason for payment termination.
 * @param {AdyenComponent}  nativeComponent Native component that performing payment.
 * @returns {void}
 */

/**
 * @typedef {Object} AdyenCheckoutProp
 * @property {*} config Collection of all necessary configurations
 * @property {PaymentMethodsResponse } paymentMethods JSON response from Adyen API `\paymentMethods`
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

  let onError = props.onError == undefined ? props.onFail : props.onError;
  let onAdditionalDetails =
    props.onAdditionalDetails == undefined
      ? props.onProvide
      : props.onAdditionalDetails;

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
    subscriptions.current.forEach((s) => s.remove());
  }, [subscriptions]);

  const startEventListeners = useCallback(
    (configuration, nativeComponent) => {
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
        // @ts-ignore
        paymentMethods,
      }}
    >
      {children}
    </AdyenCheckoutContext.Provider>
  );
};

export { AdyenCheckoutContext, AdyenCheckout };
