// @ts-check

// @ts-check

import { useEffect, useCallback, useState } from 'react';
import { Text, ActivityIndicator, View, Platform } from 'react-native';
import { AdyenCheckout, AdyenDropIn } from '@adyen/react-native';
import type {
  AdyenError,
  AdyenComponent,
  SessionsResult,
  SessionConfiguration,
} from '@adyen/react-native';
import PaymentMethods from './components/PaymentMethodsView';
import Styles from '../utilities/Styles';
import TopView from './components/TopView';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../State/checkoutConfiguration';
import type { PageProps } from '../../State/RootStackParamList';
import type { PaymentConfiguration } from '../../api/types';
import { processAdyenError } from './utils/processAdyenError';
import { ENVIRONMENT } from '../../Configuration';
import { processResult } from './utils/processResult';

const SessionsCheckout = ({ navigation }: PageProps) => {
  const { configuration } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [initError, setError] = useState<string | undefined>(undefined);
  const [session, setSession] = useState<SessionConfiguration | undefined>(
    undefined
  );

  useEffect(() => {
    const refreshSession = async (configuration: PaymentConfiguration) => {
      const returnUrl = Platform.select({
        android: await AdyenDropIn.getReturnURL(),
        default: ENVIRONMENT.returnUrl,
      });
      try {
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
    refreshSession(configuration);
  }, [configuration, setSession, setLoading, setError]);

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
      processAdyenError(error, nativeComponent);
    },
    []
  );

  const didComplete = useCallback(
    async (result: SessionsResult, nativeComponent: AdyenComponent) => {
      if (!session) {
        throw new Error('Session is not defined');
      }
      const status = await ApiClient.requestSessionResult(session.id, result.resultData); 
      processResult(status, nativeComponent, navigation);
    },
    [navigation, session]
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
    <View>
      <TopView />
      <AdyenCheckout
        config={checkoutConfiguration(configuration)}
        session={session}
        onComplete={didComplete}
        onError={didFail}
      >
        <PaymentMethods showComponents={true} />
      </AdyenCheckout>
    </View>
  );
};

export default SessionsCheckout;