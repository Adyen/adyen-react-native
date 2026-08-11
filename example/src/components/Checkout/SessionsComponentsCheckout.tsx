import { useEffect, useCallback, useMemo, useRef, useState } from 'react';
import { Text, ActivityIndicator, View } from 'react-native';
import {
  AdyenCheckout,
  AdyenComponent,
  useAdyenCheckout,
} from '@adyen/react-native';
import type {
  AdyenError,
  Configuration,
  PaymentResultHandler,
  SessionCallbacks,
  SessionsResult,
  SessionConfiguration,
} from '@adyen/react-native';
import Styles from '../common/Styles';
import AdaptiveText from '../common/AdaptiveText';
import PageScrollView from '../common/PageScrollView';
import TopView from './components/TopView';
import AvailablePaymentComponent from './components/AvailablePaymentComponent';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { ENVIRONMENT } from '../../Configuration';

interface SessionsComponentsContentProps {
  session: SessionConfiguration;
  configuration: Configuration;
  callbacks: SessionCallbacks;
}

const SessionsComponentsContent = ({
  session,
  configuration,
  callbacks,
}: SessionsComponentsContentProps) => {
  const { setup, checkout } = useAdyenCheckout();
  const [setupError, setSetupError] = useState<string | undefined>(undefined);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    setup(session, configuration, callbacks).catch((e) =>
      setSetupError(String(e))
    );
  }, [setup, session, configuration, callbacks]);

  if (setupError) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>{setupError}</Text>
      </View>
    );
  }

  if (!checkout) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <PageScrollView>
      <AdaptiveText style={Styles.paddedTitle}>Card</AdaptiveText>
      <AdyenComponent checkout={checkout} type="scheme" />
      <AvailablePaymentComponent checkout={checkout} type="applepay" />
      <AvailablePaymentComponent checkout={checkout} type="googlepay" />
    </PageScrollView>
  );
};

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
  }, [configuration, apiClient]);

  const didFail = useCallback(
    async (error: AdyenError, nativeComponent: PaymentResultHandler) => {
      processAdyenError(error, nativeComponent);
      navigateToRoot();
    },
    [navigateToRoot]
  );

  const didComplete = useCallback(
    async (result: SessionsResult, nativeComponent: PaymentResultHandler) => {
      if (
        result.resultCode === 'PresentToShopper' ||
        apiClient.usesDirectSessionResult
      ) {
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

  const callbacks = useMemo<SessionCallbacks>(
    () => ({ onComplete: didComplete, onError: didFail }),
    [didComplete, didFail]
  );

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  if (loading) {
    return (
      <View style={Styles.centeredContent}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (initError || !session) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={Styles.errorText}>
          {initError ?? 'No session available'}
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.page}>
      <TopView />
      <AdyenCheckout>
        <SessionsComponentsContent
          session={session}
          configuration={config}
          callbacks={callbacks}
        />
      </AdyenCheckout>
    </View>
  );
};

export default SessionsComponentsCheckout;
