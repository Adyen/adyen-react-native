import { useEffect, useCallback, useState } from 'react';
import { Text, ActivityIndicator, View, Platform } from 'react-native';
import { AdyenCheckout, AdyenDropIn } from '@adyen/react-native';
import type {
  AdyenError,
  AdyenComponent,
  SessionsResult,
  SessionConfiguration,
} from '@adyen/react-native';
import { CheckoutNavigator } from '../../router/CheckoutNavigator';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../utilities/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { ENVIRONMENT } from '../../Configuration';

const SessionsCheckout = () => {
  const { configuration, processResult, navigateToRoot } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [initError, setError] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<SessionConfiguration | undefined>(
    undefined
  );

  useEffect(() => {
    const refreshSession = async () => {
      try {
        const returnUrl = Platform.select({
          android: await AdyenDropIn.getReturnURL(),
          default: ENVIRONMENT.returnUrl,
        });
        console.log('Session returnUrl', returnUrl);
        const newSession = await ApiClient.requestSession(
          configuration,
          returnUrl
        );
        setSession(newSession);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    refreshSession();
  }, [configuration, setSession, setLoading, setError]);

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
      processAdyenError(error, nativeComponent);
      navigateToRoot()
    },
    []
  );

  const didComplete = useCallback(
    async (result: SessionsResult, nativeComponent: AdyenComponent) => {
      if (result.resultCode === 'PresentToShopper') {
        processResult(result, nativeComponent);
        return;
      }
      const status = await ApiClient.requestSessionResult(
        result.sessionId,
        result.sessionResult
      );
      processResult(status, nativeComponent);
    },
    [processResult]
  );

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (initError) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>{initError}</Text>
      </View>
    );
  }

  return (
    <View style={Styles.page}>
      <TopView />
      <AdyenCheckout
        config={checkoutConfiguration(configuration)}
        session={session}
        onComplete={didComplete}
        onError={didFail}
      >
        <CheckoutNavigator showComponents={false} />
      </AdyenCheckout>
    </View>
  );
};

export default SessionsCheckout;
