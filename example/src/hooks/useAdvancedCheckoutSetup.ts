//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import {
  AdyenCheckout,
  SubmitResult,
  AdditionalDetailsResult,
  ResultCode,
  type Checkout,
  type PaymentResult,
  type PaymentMethodData,
  type PaymentDetailsData,
  type AdyenError,
} from '@adyen/react-native';
import { useAppContext } from './useAppContext';
import { processAdyenError } from '../components/Checkout/utils/processAdyenError';
import { checkoutConfiguration } from '../settings/checkoutConfiguration';

/**
 * Returns a memoized setup function that fetches `/paymentMethods` and creates an advanced
 * checkout whose callbacks call the demo server and navigate to the result screen.
 */
export function useAdvancedCheckoutSetup(): () => Promise<Checkout> {
  const { configuration, navigateToResults, advancedApi } = useAppContext();

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  const didSubmit = useCallback(
    async (data: PaymentMethodData): Promise<SubmitResult> => {
      try {
        const result = await advancedApi.payments(
          data,
          configuration,
          data.returnUrl
        );
        if (result.action) {
          return SubmitResult.action(result.action);
        }
        return SubmitResult.completed(result.resultCode);
      } catch (err) {
        Alert.alert('Error', String(err));
        return SubmitResult.completed('Error');
      }
    },
    [configuration, advancedApi]
  );

  const didProvide = useCallback(
    async (data: PaymentDetailsData): Promise<AdditionalDetailsResult> => {
      try {
        const result = await advancedApi.paymentDetails(data);
        return AdditionalDetailsResult.completed(result.resultCode);
      } catch (err) {
        Alert.alert('Error', String(err));
        return AdditionalDetailsResult.completed('Error');
      }
    },
    [advancedApi]
  );

  const didComplete = useCallback(
    async (result: PaymentResult) => {
      navigateToResults({
        ...result,
        resultCode: result.resultCode ?? ResultCode.error,
      });
    },
    [navigateToResults]
  );

  const didFail = useCallback(async (adyenError: AdyenError) => {
    processAdyenError(adyenError);
  }, []);

  return useCallback(async () => {
    const paymentMethods = await advancedApi.paymentMethods(configuration);
    return AdyenCheckout.setupAdvanced(paymentMethods, config, {
      onSubmit: didSubmit,
      onAdditionalDetails: didProvide,
      onComplete: didComplete,
      onError: didFail,
    });
  }, [
    configuration,
    advancedApi,
    config,
    didSubmit,
    didProvide,
    didComplete,
    didFail,
  ]);
}
