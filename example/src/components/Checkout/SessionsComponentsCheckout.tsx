import { useEffect, useCallback, useMemo, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { AdyenCheckout, AdyenComponent } from '@adyen/react-native';
import type { AdyenError, Checkout, SessionsResult } from '@adyen/react-native';
import Styles from '../common/Styles';
import AdaptiveText from '../common/AdaptiveText';
import PageScrollView from '../common/PageScrollView';
import TopView from './components/TopView';
import AvailablePaymentComponent from './components/AvailablePaymentComponent';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { ENVIRONMENT } from '../../Configuration';

const SessionsComponentsCheckout = () => {
  const { configuration, navigateToResults, navigateToRoot, apiClient } =
    useAppContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  const didFail = useCallback(
    async (adyenError: AdyenError) => {
      processAdyenError(adyenError);
      navigateToRoot();
    },
    [navigateToRoot]
  );

  const didComplete = useCallback(
    async (result: SessionsResult) => {
      if (
        result.resultCode === 'PresentToShopper' ||
        apiClient.usesDirectSessionResult
      ) {
        navigateToResults(result);
        return;
      }
      const status = await apiClient.requestSessionResult(
        result.sessionId,
        result.sessionResult
      );
      navigateToResults(status);
    },
    [navigateToResults, apiClient]
  );

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const returnUrl = ENVIRONMENT.returnUrl;
        const session = await apiClient.requestSession(
          configuration,
          returnUrl
        );
        const c = await AdyenCheckout.setup(session, config, {
          onComplete: didComplete,
          onError: didFail,
        });
        if (active) {
          setCheckout(c);
        }
      } catch (e) {
        if (active) {
          setError(String(e));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    init();
    return () => {
      active = false;
    };
  }, [configuration, apiClient, config, didComplete, didFail]);

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !checkout) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>{error ?? 'No session available'}</Text>
      </View>
    );
  }

  return (
    <View style={Styles.page}>
      <TopView />
      <PageScrollView>
        <AdaptiveText style={Styles.paddedTitle}>Card</AdaptiveText>
        <AdyenComponent checkout={checkout} type="scheme" />
        <AvailablePaymentComponent checkout={checkout} type="applepay" />
        <AvailablePaymentComponent checkout={checkout} type="googlepay" />
      </PageScrollView>
    </View>
  );
};

export default SessionsComponentsCheckout;
