//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import {
  AdyenAction,
  AdyenCheckout,
  AdyenComponent,
  AdyenCSE,
  AdyenDropIn,
  type AddressLookup,
  type AddressLookupItem,
  type Checkout,
  type Configuration,
  type Controller,
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
import { cardController, errorCode, Status, wait } from './ValidationShared';
import CapabilityValidation, {
  type CapabilityScenario,
} from './CapabilityValidation';

type Scenario =
  | 'sessions'
  | 'advanced'
  | 'lookup'
  | 'dropin-sessions'
  | 'dropin-advanced'
  | 'headless-sessions'
  | 'headless-advanced'
  | 'lifecycle';
type Props = NativeStackScreenProps<HomeStackParamList, 'ValidationRoutes'>;

const HEADLESS_SCENARIOS: readonly Scenario[] = [
  'headless-sessions',
  'headless-advanced',
];
// Gives the native view time to bind and detach between recycle steps.
const RECYCLE_STEP_MS = 250;
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

const ValidationRoutes = ({ navigation }: Props) => {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [capabilityScenario, setCapabilityScenario] =
    useState<CapabilityScenario | null>(null);

  if (capabilityScenario) {
    return (
      <CapabilityValidation
        scenario={capabilityScenario}
        onExit={() => setCapabilityScenario(null)}
      />
    );
  }

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
        testID="validation-route-dropin-sessions"
        title="Sessions Drop-in"
        onPress={() => setScenario('dropin-sessions')}
      />
      <Button
        testID="validation-route-dropin-advanced"
        title="Advanced Drop-in"
        onPress={() => setScenario('dropin-advanced')}
      />
      <Button
        testID="validation-route-lifecycle"
        title="Lifecycle and standalone"
        onPress={() => setScenario('lifecycle')}
      />
      <Button
        testID="validation-route-stored"
        title="Stored card controller"
        onPress={() => setCapabilityScenario('stored')}
      />
      <Button
        testID="validation-route-multi-mount"
        title="Two mounted controllers"
        onPress={() => setCapabilityScenario('multi-mount')}
      />
      <Button
        testID="validation-route-giftcards"
        title="Gift card instances"
        onPress={() => setCapabilityScenario('giftcards')}
      />
      <Button
        testID="validation-route-auto-submit"
        title="No-input auto-submit"
        onPress={() => setCapabilityScenario('auto-submit')}
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
  const { sessionsApi, advancedApi, configuration, navigateToResults } =
    useAppContext();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [status, setStatus] = useState('setting-up');
  const isHeadlessScenario = HEADLESS_SCENARIOS.includes(scenario);
  const isAdvancedScenario =
    scenario === 'advanced' ||
    scenario === 'headless-advanced' ||
    scenario === 'dropin-advanced';
  const isDropInScenario =
    scenario === 'dropin-sessions' || scenario === 'dropin-advanced';
  const isEmbeddedScenario = !isHeadlessScenario && !isDropInScenario;
  const [presentedController, setPresentedController] =
    useState<Controller | null>(null);
  const [showPresenter, setShowPresenter] = useState(isEmbeddedScenario);
  const staleCheckout = useRef<Checkout | null>(null);
  const staleController = useRef<Controller | null>(null);
  const currentCheckout = useRef<Checkout | null>(null);
  const suppressContentionError = useRef(false);
  const standaloneAction = useRef<Promise<unknown> | null>(null);
  const contention = useRef<{
    startedAt: number;
    contenderCode?: string;
    contenderSettledAt?: number;
    ownerEndedAt?: number;
  } | null>(null);
  const [contentionOrder, setContentionOrder] = useState<{
    value: string;
    detail: string;
  } | null>(null);

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
    const race = contention.current;
    if (race && race.ownerEndedAt === undefined) {
      // The owner's terminal event marks the end of its operation, so a contender that settled
      // before it was rejected while the owner was still active.
      const ownerEndedAt = Date.now();
      race.ownerEndedAt = ownerEndedAt;
      const { contenderSettledAt } = race;
      const settledFirst =
        contenderSettledAt !== undefined && contenderSettledAt <= ownerEndedAt;
      setContentionOrder({
        value: settledFirst
          ? `${race.contenderCode}-while-owner-active`
          : 'owner-ended-before-contender',
        detail: `contender +${
          settledFirst ? contenderSettledAt - race.startedAt : '?'
        } ms, owner ended +${ownerEndedAt - race.startedAt} ms`,
      });
    }
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

  const setup = useCallback(
    async (mountPresenter = false) => {
      setStatus('setting-up');
      let next: Checkout;
      try {
        if (isAdvancedScenario) {
          const paymentMethods =
            await advancedApi.paymentMethods(configuration);
          next = await AdyenCheckout.setupAdvanced(
            paymentMethods,
            checkoutConfigurationForScenario,
            {
              onSubmit: async (data: PaymentMethodData) => {
                const result = await advancedApi.payments(
                  data,
                  configuration,
                  data.returnUrl
                );
                return result.action
                  ? { type: 'action', action: result.action }
                  : { type: 'completed', resultCode: result.resultCode };
              },
              onAdditionalDetails: async (data: PaymentDetailsData) => {
                const result = await advancedApi.paymentDetails(data);
                return { type: 'completed', resultCode: result.resultCode };
              },
              onComplete,
              onError,
            }
          );
        } else {
          const session = await sessionsApi.requestSession(
            configuration,
            ENVIRONMENT.returnUrl
          );
          next = await AdyenCheckout.setup(
            session,
            checkoutConfigurationForScenario,
            {
              onComplete,
              onError,
            }
          );
        }
        currentCheckout.current = next;
        setCheckout(next);
      } catch (error) {
        setStatus(`setup-${errorCode(error)}`);
        return;
      }
      if (mountPresenter && isEmbeddedScenario) {
        try {
          setPresentedController(await cardController(next));
        } catch (error) {
          setStatus(`embedded-${errorCode(error)}`);
          return;
        }
      }
      setStatus(
        scenario === 'lookup'
          ? 'lookup-ready'
          : isDropInScenario
            ? 'dropin-ready'
            : isHeadlessScenario
              ? 'headless-ready'
              : 'embedded-ready'
      );
    },
    [
      sessionsApi,
      advancedApi,
      checkoutConfigurationForScenario,
      configuration,
      onComplete,
      onError,
      scenario,
      isAdvancedScenario,
      isDropInScenario,
      isEmbeddedScenario,
      isHeadlessScenario,
    ]
  );

  useEffect(() => {
    setup(true).catch(() => undefined);
    return () => {
      currentCheckout.current?.invalidate().catch(() => undefined);
    };
    // Checkout cleanup intentionally uses the handle active when this route unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replaceCheckout = useCallback(async () => {
    if (!checkout) return;
    staleCheckout.current = checkout;
    staleController.current = await cardController(checkout).catch(() => null);
    await setup();
    setStatus('mounted-presenter-inactive');
  }, [checkout, setup]);

  const submitStaleCheckout = useCallback(async () => {
    try {
      const stale =
        staleController.current ??
        (staleCheckout.current
          ? await cardController(staleCheckout.current)
          : null);
      await stale?.submit();
      setStatus('stale-submit-unexpected');
    } catch (error) {
      setStatus(`stale-submit-${errorCode(error)}`);
    }
  }, []);

  // Runs on the active checkout so invalidate() itself, not an earlier replacement, makes the
  // handle stale.
  const runStaleCommands = useCallback(async () => {
    const active = checkout;
    const card = active?.paymentMethods.regular.first(
      (paymentMethod) => paymentMethod.type === 'scheme'
    );
    if (!active || !card) {
      setStatus('stale-commands-missing');
      return;
    }
    let controller: Controller;
    try {
      controller = await active.createController(card);
    } catch (error) {
      setStatus(`stale-commands-active-${errorCode(error)}`);
      return;
    }
    try {
      await active.invalidate();
      await active.invalidate();
    } catch (error) {
      setStatus(`stale-commands-invalidate-${errorCode(error)}`);
      return;
    }
    const outcomes = await Promise.allSettled([
      controller.submit(),
      active.createController(card),
      active.isAvailable(card),
      AdyenDropIn.start(active),
    ]);
    const codes = outcomes.map((outcome) =>
      outcome.status === 'rejected' ? errorCode(outcome.reason) : 'resolved'
    );
    setStatus(
      codes.every((code) => code === 'staleCheckout')
        ? 'stale-commands-staleCheckout'
        : `stale-commands-${codes.join('-')}`
    );
  }, [checkout]);

  const recyclePresenter = useCallback(async () => {
    if (!checkout) return;
    const controller = await cardController(checkout);
    setPresentedController(controller);
    setShowPresenter(true);
    await wait(RECYCLE_STEP_MS);
    setShowPresenter(false);
    await wait(RECYCLE_STEP_MS);
    setShowPresenter(true);
    await wait(RECYCLE_STEP_MS);
    setShowPresenter(false);
    const again = await cardController(checkout);
    setStatus(
      again === controller ? 'presenter-recycled' : 'presenter-duplicated'
    );
  }, [checkout]);

  const remountPresenter = useCallback(async () => {
    if (!checkout) return;
    const controller = await cardController(checkout);
    if (controller !== presentedController) {
      setStatus('presenter-remount-different-controller');
      return;
    }
    setShowPresenter(true);
    await wait(RECYCLE_STEP_MS);
    setStatus('presenter-remounted');
  }, [checkout, presentedController]);

  const unmountPresenter = useCallback(() => {
    setShowPresenter(false);
    setStatus('presenter-unmounted');
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
    const controller = await cardController(checkout);
    const race: NonNullable<typeof contention.current> = {
      startedAt: Date.now(),
    };
    contention.current = race;
    setContentionOrder(null);
    const settleContender = (code: string) => {
      race.contenderCode = code;
      race.contenderSettledAt = Date.now();
      setStatus(`contention-${code}`);
    };
    // The owner keeps its sheet open until the shopper acts, so the contender outcome is
    // published as soon as the contender settles rather than after both promises.
    controller.submit().catch(() => undefined);
    await controller.submit().then(
      () => settleContender('unexpected'),
      (error) => settleContender(errorCode(error))
    );
  }, [checkout]);

  const doubleCreateController = useCallback(async () => {
    if (!checkout) return;
    const [first, second] = await Promise.all([
      cardController(checkout),
      cardController(checkout),
    ]);
    setStatus(
      first === second && first === presentedController
        ? 'controller-idempotent'
        : 'controller-duplicated'
    );
  }, [checkout, presentedController]);

  const startHeadless = useCallback(
    async (fresh = false) => {
      if (!checkout) return;
      const controller = await cardController(checkout);
      await controller.submit();
      setStatus(fresh ? 'fresh-headless-started' : 'headless-started');
    },
    [checkout]
  );

  const startDropIn = useCallback(async () => {
    if (!checkout) return;
    try {
      await AdyenDropIn.start(checkout);
      setStatus('dropin-presented');
    } catch (error) {
      setStatus(`dropin-${errorCode(error)}-presentation`);
    }
  }, [checkout]);

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
      const result = await advancedApi.payments(
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
  }, [advancedApi, checkoutConfigurationForScenario, configuration]);

  const cancelStandaloneAction = useCallback(async () => {
    await AdyenAction.hide();
    await standaloneAction.current?.catch(() => undefined);
    setStatus('standalone-action-cancelled');
  }, []);

  const embeddedPresenter =
    presentedController && showPresenter ? (
      <View testID="validation-embedded-presenter">
        <AdyenComponent controller={presentedController} />
      </View>
    ) : null;

  return (
    <ScrollView style={Styles.page} contentContainerStyle={Styles.padded}>
      <Status value={status} />
      {contentionOrder ? (
        <Text
          testID="validation-contention-order"
          accessibilityLabel={`validation-contention-order-${contentionOrder.value}`}
        >
          {`${contentionOrder.value} (${contentionOrder.detail})`}
        </Text>
      ) : null}
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
        testID="validation-stale-commands"
        title="Run stale checkout commands"
        onPress={() => {
          runStaleCommands().catch(() => undefined);
        }}
      />
      <Button
        testID="validation-recycle-presenter"
        title="Recycle presenter"
        onPress={() => {
          recyclePresenter().catch((error) => {
            setStatus(`presenter-recycle-${errorCode(error)}`);
          });
        }}
      />
      <Button
        testID="validation-remount-presenter"
        title="Remount presenter"
        onPress={() => {
          remountPresenter().catch((error) => {
            setStatus(`presenter-remount-${errorCode(error)}`);
          });
        }}
      />
      <Button
        testID="validation-double-create"
        title="Create card controller twice"
        onPress={() => {
          doubleCreateController().catch((error) => {
            setStatus(`controller-create-${errorCode(error)}`);
          });
        }}
      />
      <Button
        testID="validation-unmount-presenter"
        title="Unmount presenter"
        onPress={unmountPresenter}
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
      {isDropInScenario ? (
        <Button
          testID="validation-start-dropin"
          title="Start Drop-in"
          onPress={() => {
            startDropIn().catch(() => undefined);
          }}
        />
      ) : null}
      {scenario === 'lookup' ? (
        <Button
          testID="validation-exit-unsupported-lookup"
          title="Exit unsupported lookup"
          onPress={onExit}
        />
      ) : null}
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
