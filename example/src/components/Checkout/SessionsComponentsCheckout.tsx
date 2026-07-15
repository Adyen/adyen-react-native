import { useEffect, useCallback, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import { AdyenCheckout } from '@adyen/react-native';
import type {
  AdyenError,
  AdyenComponent,
  SessionsResult,
  SessionConfiguration,
} from '@adyen/react-native';
import { CheckoutNavigator } from '../../router/CheckoutNavigator';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { ENVIRONMENT } from '../../Configuration';

const SessionsComponentsCheckout = () => {
  const { configuration, processResult, navigateToRoot, apiClient } =
    useAppContext();
  const [loading, setLoading] = useState(true);
  const [initError, setError] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<SessionConfiguration | undefined>(
    undefined
  );

  useEffect(() => {
    const refreshSession = async () => {
      try {
        const returnUrl = ENVIRONMENT.returnUrl;
        const newSession = await apiClient.requestSession(
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
  }, [configuration, setSession, setLoading, setError, apiClient]);

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
      processAdyenError(error, nativeComponent);
      navigateToRoot();
    },
    [navigateToRoot]
  );

  const didComplete = useCallback(
    async (result: SessionsResult, nativeComponent: AdyenComponent) => {
      if (result.resultCode === 'PresentToShopper') {
        processResult(result, nativeComponent);
        return;
      }
      const status = await apiClient.requestSessionResult(
        result.sessionId,
        result.sessionResult
      );
      processResult(status, nativeComponent);
    },
    [processResult, apiClient]
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
        <CheckoutNavigator showEmbeddedComponents={true} showInstant={true} />
      </AdyenCheckout>
    </View>
  );
};

export default SessionsComponentsCheckout;
