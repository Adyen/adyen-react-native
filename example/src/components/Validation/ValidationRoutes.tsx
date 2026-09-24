//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Platform, ScrollView, Text, View } from 'react-native';
import {
  AdyenAction,
  AdyenCheckout,
  AdyenComponent,
  AdyenCSE,
  type AddressLookup,
  type AddressLookupItem,
  type Checkout,
  type Configuration,
  type PaymentDetailsData,
  type PaymentMethodData,
  type PaymentResult,
  type SessionsResult,
  ResultCode,
} from '@adyen/react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../router/HomeStackNavigator';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { ENVIRONMENT } from '../../Configuration';
import Styles from '../common/Styles';

type Scenario = 'sessions' | 'advanced' | 'lookup' | 'lifecycle';
type Props = NativeStackScreenProps<HomeStackParamList, 'ValidationRoutes'>;

const LOOKUP_CANDIDATE: AddressLookupItem = {
  id: 'validation-address-candidate',
  address: {
    houseNumberOrName: '1',
    street: 'Damrak',
    city: 'Amsterdam',
    country: 'NL',
    postalCode: '1012LG',
  },
};

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'error';
}

const Status = ({ value }: { value: string }) => (
  <Text
    testID="validation-status"
    accessibilityLabel={`validation-status-${value}`}
  >
    {value}
  </Text>
);

const ValidationRoutes = ({ navigation }: Props) => {
  const [scenario, setScenario] = useState<Scenario | null>(null);

  if (scenario) {
    return (
      <ValidationCheckout
        scenario={scenario}
        onExit={() => setScenario(null)}
      />
    );
  }

  return (
    <ScrollView style={Styles.page} contentContainerStyle={Styles.padded}>
      <Text testID="validation-route-menu">
        Deterministic validation routes
      </Text>
      <Button
        testID="validation-route-sessions"
        title="Sessions embedded"
        onPress={() => setScenario('sessions')}
      />
      <Button
        testID="validation-route-advanced"
        title="Advanced embedded"
        onPress={() => setScenario('advanced')}
      />
      <Button
        testID="validation-route-address-lookup"
        title="iOS address lookup"
        onPress={() => setScenario('lookup')}
      />
      <Button
        testID="validation-route-lifecycle"
        title="Lifecycle and standalone"
        onPress={() => setScenario('lifecycle')}
      />
      <Button
        testID="validation-route-exit"
        title="Back to Home"
        onPress={() => navigation.goBack()}
      />
    </ScrollView>
  );
};

const ValidationCheckout = ({
  scenario,
  onExit,
}: {
  scenario: Scenario;
  onExit: () => void;
}) => {
  const { apiClient, configuration, navigateToResults } = useAppContext();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [status, setStatus] = useState('setting-up');
  const [showPresenter, setShowPresenter] = useState(
    () => scenario !== 'lifecycle'
  );
  const staleCheckout = useRef<Checkout | null>(null);
  const currentCheckout = useRef<Checkout | null>(null);
  const suppressContentionError = useRef(false);

  const onComplete = useCallback(
    async (result: SessionsResult | PaymentResult) => {
      setStatus(`terminal-${result.resultCode ?? ResultCode.error}`);
      navigateToResults({
        ...result,
        resultCode: result.resultCode ?? ResultCode.error,
      });
    },
    [navigateToResults]
  );

  const onLookup = useCallback((query: string, lookup: AddressLookup) => {
    setStatus(`lookup-query-${query ? 'received' : 'empty'}`);
    lookup.update([LOOKUP_CANDIDATE]);
  }, []);

  const onConfirmLookup = useCallback(
    (candidate: AddressLookupItem, lookup: AddressLookup) => {
      setStatus(
        candidate.id === LOOKUP_CANDIDATE.id
          ? 'lookup-candidate-confirmed'
          : 'lookup-candidate-unexpected'
      );
      lookup.confirm(candidate);
    },
    []
  );

  const onError = useCallback((error: unknown) => {
    if (!suppressContentionError.current) {
      setStatus(`error-${errorCode(error)}`);
    }
  }, []);

  const baseConfiguration = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );
  const checkoutConfigurationForScenario = useMemo<Configuration>(() => {
    if (scenario !== 'lookup') {
      return baseConfiguration;
    }
    return {
      ...baseConfiguration,
      card: {
        ...baseConfiguration.card,
        addressVisibility: 'lookup',
        onUpdateAddress: onLookup,
        onConfirmAddress: onConfirmLookup,
      },
    };
  }, [baseConfiguration, onConfirmLookup, onLookup, scenario]);

  const setup = useCallback(async () => {
    setStatus('setting-up');
    try {
      if (scenario === 'advanced') {
        const paymentMethods = await apiClient.paymentMethods(configuration);
        const next = await AdyenCheckout.setupAdvanced(
          paymentMethods,
          checkoutConfigurationForScenario,
          {
            onSubmit: async (data: PaymentMethodData) => {
              const result = await apiClient.payments(
                data,
                configuration,
                data.returnUrl
              );
              return result.action
                ? { type: 'action', action: result.action }
                : { type: 'completed', resultCode: result.resultCode };
            },
            onAdditionalDetails: async (data: PaymentDetailsData) => {
              const result = await apiClient.paymentDetails(data);
              return { type: 'completed', resultCode: result.resultCode };
            },
            onComplete,
            onError,
          }
        );
        currentCheckout.current = next;
        setCheckout(next);
      } else {
        const session = await apiClient.requestSession(
          configuration,
          ENVIRONMENT.returnUrl
        );
        const next = await AdyenCheckout.setup(
          session,
          checkoutConfigurationForScenario,
          {
            onComplete,
            onError,
          }
        );
        currentCheckout.current = next;
        setCheckout(next);
      }
      setStatus(
        scenario === 'lookup'
          ? Platform.OS === 'ios'
            ? 'lookup-ready'
            : 'lookup-unsupportedCapability'
          : 'embedded-ready'
      );
    } catch (error) {
      setStatus(`setup-${errorCode(error)}`);
    }
  }, [
    apiClient,
    checkoutConfigurationForScenario,
    configuration,
    onComplete,
    onError,
    scenario,
  ]);

  useEffect(() => {
    setup().catch(() => undefined);
    return () => {
      currentCheckout.current?.invalidate().catch(() => undefined);
    };
    // Checkout cleanup intentionally uses the handle active when this route unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replaceCheckout = useCallback(async () => {
    if (!checkout) return;
    staleCheckout.current = checkout;
    await setup();
    setStatus('checkout-replaced');
  }, [checkout, setup]);

  const submitStaleCheckout = useCallback(async () => {
    try {
      await staleCheckout.current?.submit({
        kind: 'paymentMethod',
        type: 'scheme',
      });
      setStatus('stale-submit-unexpected');
    } catch (error) {
      setStatus(`stale-submit-${errorCode(error)}`);
    }
  }, []);

  const invalidateCheckout = useCallback(async () => {
    try {
      await checkout?.invalidate();
      setStatus('checkout-invalidated');
    } catch (error) {
      setStatus(`invalidate-${errorCode(error)}`);
    }
  }, [checkout]);

  const contend = useCallback(async () => {
    if (!checkout) return;
    suppressContentionError.current = true;
    const target = { kind: 'paymentMethod' as const, type: 'scheme' };
    const [, contender] = await Promise.allSettled([
      checkout.submit(target),
      checkout.submit(target),
    ]);
    setStatus(
      contender.status === 'rejected'
        ? `contention-${errorCode(contender.reason)}`
        : 'contention-unexpected'
    );
  }, [checkout]);

  const validateCse = useCallback(async () => {
    const [number, expiry, securityCode] = await Promise.all([
      AdyenCSE.validateCardNumber('4111111111111111', true),
      AdyenCSE.validateCardExpiryDate('03', '30'),
      AdyenCSE.validateCardSecurityCode('737', 'visa'),
    ]);
    setStatus(
      number && expiry && securityCode
        ? 'cse-validation-complete'
        : 'cse-validation-failed'
    );
  }, []);

  const cancelStandaloneAction = useCallback(async () => {
    await AdyenAction.hide();
    setStatus('standalone-action-cancelled');
  }, []);

  return (
    <ScrollView style={Styles.page} contentContainerStyle={Styles.padded}>
      <Status value={status} />
      <Text testID={`validation-scenario-${scenario}`}>{scenario}</Text>
      {checkout && showPresenter ? (
        <View testID="validation-embedded-presenter">
          <AdyenComponent checkout={checkout} type="scheme" />
        </View>
      ) : null}
      <Button
        testID="validation-replace-checkout"
        title="Replace checkout"
        onPress={() => {
          replaceCheckout().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-submit-stale"
        title="Submit stale checkout"
        onPress={() => {
          submitStaleCheckout().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-invalidate"
        title="Invalidate checkout"
        onPress={() => {
          invalidateCheckout().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-recycle-presenter"
        title="Recycle presenter"
        onPress={() => {
          setShowPresenter(true);
          setTimeout(() => {
            setShowPresenter(false);
            setStatus('presenter-recycled');
          }, 0);
        }}
      />
      <Button
        testID="validation-headless-contention"
        title="Run headless contention"
        onPress={() => {
          contend().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-cse"
        title="Validate CSE"
        onPress={() => {
          validateCse().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-action-cancel"
        title="Cancel standalone action"
        onPress={() => {
          cancelStandaloneAction().catch(() => undefined);
        }}
      />
      <Button testID="validation-exit" title="Exit" onPress={onExit} />
    </ScrollView>
  );
};

export default ValidationRoutes;
