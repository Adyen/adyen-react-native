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
  type PaymentAction,
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

type Scenario =
  | 'sessions'
  | 'advanced'
  | 'lookup'
  | 'headless-sessions'
  | 'headless-advanced'
  | 'lifecycle';
type Props = NativeStackScreenProps<HomeStackParamList, 'ValidationRoutes'>;

const HEADLESS_SCENARIOS: readonly Scenario[] = [
  'headless-sessions',
  'headless-advanced',
];
const ACTION_TEST_CARD = {
  // Adyen's published native mobile 3DS2 challenge card returns a non-redirect Action.
  number: '5201285565672311',
  expiryMonth: '03',
  expiryYear: '2030',
  cvv: '737',
};
const CSE_TEST_CARD = {
  number: '4111111111111111',
  expiryMonth: '03',
  expiryYear: '2030',
  cvv: '737',
};

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
        testID="validation-route-headless-sessions"
        title="Sessions headless"
        onPress={() => setScenario('headless-sessions')}
      />
      <Button
        testID="validation-route-headless-advanced"
        title="Advanced headless"
        onPress={() => setScenario('headless-advanced')}
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
  const [mountedCheckout, setMountedCheckout] = useState<Checkout | null>(null);
  const [showPresenter, setShowPresenter] = useState(
    () => !HEADLESS_SCENARIOS.includes(scenario)
  );
  const staleCheckout = useRef<Checkout | null>(null);
  const currentCheckout = useRef<Checkout | null>(null);
  const suppressContentionError = useRef(false);
  const standaloneAction = useRef<Promise<unknown> | null>(null);
  const isHeadlessScenario = HEADLESS_SCENARIOS.includes(scenario);
  const isAdvancedScenario =
    scenario === 'advanced' || scenario === 'headless-advanced';

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
      if (isAdvancedScenario) {
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
        setMountedCheckout((mounted) => mounted ?? next);
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
        setMountedCheckout((mounted) => mounted ?? next);
      }
      setStatus(
        scenario === 'lookup'
          ? Platform.OS === 'ios'
            ? 'lookup-ready'
            : 'lookup-unsupportedCapability'
          : isHeadlessScenario
            ? 'headless-ready'
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
    isAdvancedScenario,
    isHeadlessScenario,
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
    setStatus('mounted-presenter-inactive');
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

  const cleanupContention = useCallback(async () => {
    try {
      await checkout?.invalidate();
      setStatus('contention-owner-cleaned');
    } catch (error) {
      setStatus(`contention-cleanup-${errorCode(error)}`);
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

  const startHeadless = useCallback(
    async (fresh = false) => {
      if (!checkout) return;
      await checkout.submit({ kind: 'paymentMethod', type: 'scheme' });
      setStatus(fresh ? 'fresh-headless-started' : 'headless-started');
    },
    [checkout]
  );

  const startFreshCheckout = useCallback(async () => {
    await setup();
    setStatus('fresh-checkout-ready');
  }, [setup]);

  const validateCse = useCallback(async () => {
    const [encrypted, number, expiry, securityCode] = await Promise.all([
      AdyenCSE.encryptCard(CSE_TEST_CARD, ENVIRONMENT.publicKey),
      AdyenCSE.validateCardNumber(CSE_TEST_CARD.number, true),
      AdyenCSE.validateCardExpiryDate('03', '30'),
      AdyenCSE.validateCardSecurityCode('737', 'visa'),
    ]);
    setStatus(
      encrypted.number &&
        encrypted.expiryMonth &&
        encrypted.expiryYear &&
        encrypted.cvv &&
        number &&
        expiry &&
        securityCode
        ? 'cse-encryption-and-validation-complete'
        : 'cse-validation-failed'
    );
  }, []);

  const startStandaloneAction = useCallback(async () => {
    setStatus('standalone-action-starting');
    try {
      const encrypted = await AdyenCSE.encryptCard(
        ACTION_TEST_CARD,
        ENVIRONMENT.publicKey
      );
      const result = await apiClient.payments(
        {
          paymentMethod: {
            type: 'scheme',
            encryptedCardNumber: encrypted.number,
            encryptedExpiryMonth: encrypted.expiryMonth,
            encryptedExpiryYear: encrypted.expiryYear,
            encryptedSecurityCode: encrypted.cvv,
            threeDS2SdkVersion: await AdyenAction.getThreeDS2SdkVersion(),
          },
          returnUrl: `${ENVIRONMENT.returnUrl}/standalone-action`,
        },
        configuration,
        `${ENVIRONMENT.returnUrl}/standalone-action`,
        true
      );
      if (!result.action) {
        setStatus('standalone-action-missing-action');
        return;
      }
      const operation = AdyenAction.handle(
        result.action as PaymentAction,
        checkoutConfigurationForScenario
      );
      standaloneAction.current = operation;
      setStatus('standalone-action-active');
      operation.then(
        () => setStatus('standalone-action-completed'),
        (error) => {
          setStatus(
            errorCode(error) === 'cancelled'
              ? 'standalone-action-cancelled'
              : `standalone-action-${errorCode(error)}`
          );
        }
      );
    } catch (error) {
      setStatus(`standalone-action-${errorCode(error)}`);
    }
  }, [apiClient, checkoutConfigurationForScenario, configuration]);

  const cancelStandaloneAction = useCallback(async () => {
    await AdyenAction.hide();
    await standaloneAction.current?.catch(() => undefined);
    setStatus('standalone-action-cancelled');
  }, []);

  const embeddedPresenter =
    mountedCheckout && showPresenter ? (
      <View testID="validation-embedded-presenter">
        <AdyenComponent checkout={mountedCheckout} type="scheme" />
      </View>
    ) : null;

  return (
    <ScrollView style={Styles.page} contentContainerStyle={Styles.padded}>
      <Status value={status} />
      <Text testID={`validation-scenario-${scenario}`}>{scenario}</Text>
      {scenario !== 'lifecycle' ? embeddedPresenter : null}
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
        testID="validation-start-headless"
        title="Start headless payment"
        onPress={() => {
          startHeadless().catch((error) => {
            setStatus(`headless-${errorCode(error)}`);
          });
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
        testID="validation-cleanup-contention"
        title="Clean up contention owner"
        onPress={() => {
          cleanupContention().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-start-fresh-checkout"
        title="Start fresh checkout"
        onPress={() => {
          startFreshCheckout().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-start-fresh-headless"
        title="Start fresh headless payment"
        onPress={() => {
          startHeadless(true).catch((error) => {
            setStatus(`fresh-headless-${errorCode(error)}`);
          });
        }}
      />
      <Button
        testID="validation-cse"
        title="Encrypt and validate CSE"
        onPress={() => {
          validateCse().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-start-action"
        title="Start standalone action"
        onPress={() => {
          startStandaloneAction().catch(() => undefined);
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
      {scenario === 'lifecycle' ? embeddedPresenter : null}
    </ScrollView>
  );
};

export default ValidationRoutes;
