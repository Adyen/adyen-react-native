import { httpPost } from '../Services/https';
import { CheckoutAttemptIdSession, CollectIdProps } from './types';

/**
 * Log event to Adyen
 * @param config - ready to be serialized and included in the body of request
 * @returns a function returning a promise containing the response of the call
 */
const collectId = ({ environment, clientKey }: CollectIdProps) => {
  let promise: Promise<CheckoutAttemptIdSession>;

  const options = {
    errorLevel: 'silent' as const,
    environment: environment,
    path: `v2/analytics/id?clientKey=${clientKey}`,
  };

  return (): Promise<CheckoutAttemptIdSession> => {
    if (promise) return promise;
    if (!clientKey) return Promise.reject();

    promise = httpPost(options, {})
      .then((conversion: any) => {
        if (conversion.id) {
          return { id: conversion.id, timestamp: Date.now() } as any;
        }
        return undefined;
      })
      .catch(() => {});

    return promise;
  };
};

export default collectId;
