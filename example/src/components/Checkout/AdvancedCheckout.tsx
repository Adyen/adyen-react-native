import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { AdyenCheckout } from '@adyen/react-native';
import {
  SubmitResult,
  AdditionalDetailsResult,
  ResultCode,
  type PaymentResult,
  type PaymentMethodData,
  type PaymentDetailsData,
  type AdyenError,
} from '@adyen/react-native';
import CheckoutContainer from './components/CheckoutContainer';
import PaymentMethodsList from './components/PaymentMethodsList';
import { useAppContext } from '../../hooks/useAppContext';
import { processAdyenError } from './utils/processAdyenError';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';

const AdvancedCheckout = () => {
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

  const advancedSetup = useCallback(async () => {
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

  return (
    <CheckoutContainer setup={advancedSetup}>
      {(checkout) => <PaymentMethodsList checkout={checkout} />}
    </CheckoutContainer>
  );
};

export default AdvancedCheckout;
