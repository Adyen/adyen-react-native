import { useEffect, useCallback, useState } from 'react';
import { Text, ActivityIndicator, View, Platform } from 'react-native';
import {
  AdyenCheckout,
  AdyenDropIn,
  ErrorCode,
  ResultCode,
} from '@adyen/react-native';
import type {
  AdyenError,
  AdyenComponent,
  SessionsResult,
  SessionConfiguration,
} from '@adyen/react-native';
import PaymentMethods from './components/PaymentMethodsView';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import ApiClient from '../../api/APIClient';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../State/checkoutConfiguration';
import type { PageProps } from '../../State/RootStackParamList';
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

  const refreshSession = useCallback(async () => {
    const returnUrl = Platform.select({
      android: await AdyenDropIn.getReturnURL(),
      default: ENVIRONMENT.returnUrl,
    });
    setLoading(true);
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
  }, [configuration]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: AdyenComponent) => {
      if (error.errorCode === ErrorCode.sessionError) {
        setError(error.message);
        return;
      }
      processAdyenError(error, nativeComponent);
      refreshSession();
    },
    [refreshSession]
  );

  const didComplete = useCallback(
    async (result: SessionsResult, nativeComponent: AdyenComponent) => {
      if (result.resultCode === ResultCode.presentToShopper) {
        processResult(result, nativeComponent, navigation);
        return;
      }
      const status = await ApiClient.requestSessionResult(
        result.sessionId,
        result.sessionResult
      );
      processResult(status, nativeComponent, navigation);
    },
    [navigation]
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
        <PaymentMethods showComponents={false} />
      </AdyenCheckout>
    </View>
  );
};

export default SessionsCheckout;
