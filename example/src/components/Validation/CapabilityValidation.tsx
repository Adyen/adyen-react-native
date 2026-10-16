//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import {
  AdyenCheckout,
  AdyenComponent,
  ResultCode,
  type Checkout,
  type CheckoutPaymentMethod,
  type Controller,
  type PaymentDetailsData,
  type PaymentMethodData,
  type PaymentResult,
} from '@adyen/react-native';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import type { StoredCardPaymentMethod } from '../../api/types';
import PaymentMethodComponent from '../Checkout/components/PaymentMethodComponent';
import Styles from '../common/Styles';
import { cardController, errorCode, Status } from './ValidationShared';

export type CapabilityScenario =
  'stored' | 'multi-mount' | 'giftcards' | 'auto-submit';

type Phase = 'store' | 'pay';

interface GiftcardProbe {
  id: string;
  brand: string;
  available: boolean;
  outcome: string;
}

const STORED_CARD_LAST_FOUR = '1111';
const GIFTCARD_TYPE = 'giftcard';
// Wallets present their own payment sheet, so they can neither mount next to a card form nor
// complete without native UI.
const WALLET_TYPES = new Set(['applepay', 'googlepay', 'androidpay']);

async function probeGiftcard(
  checkout: Checkout,
  paymentMethod: CheckoutPaymentMethod,
  controllers: Set<Controller>
): Promise<GiftcardProbe> {
  const probe = {
    id: paymentMethod.id,
    brand: paymentMethod.brand ?? paymentMethod.name ?? GIFTCARD_TYPE,
  };
  const available = await checkout.isAvailable(paymentMethod);
  try {
    const controller = await checkout.createController(paymentMethod);
    if (!available) {
      return { ...probe, available, outcome: 'unexpected-controller' };
    }
    if (controller.paymentMethod.id !== paymentMethod.id) {
      return { ...probe, available, outcome: 'substituted' };
    }
    if (controllers.has(controller)) {
      return { ...probe, available, outcome: 'shared-controller' };
    }
    controllers.add(controller);
    return { ...probe, available, outcome: 'exact-controller' };
  } catch (error) {
    const code = errorCode(error);
    return {
      ...probe,
      available,
      outcome: available ? `rejected-${code}` : code,
    };
  }
}

function giftcardStatus(probes: GiftcardProbe[]): string {
  const ids = new Set(probes.map((probe) => probe.id));
  if (probes.length === 0) return 'giftcards-missing';
  if (ids.size !== probes.length) return 'giftcards-duplicate-ids';
  const verified = probes.every((probe) =>
    probe.available
      ? probe.outcome === 'exact-controller'
      : probe.outcome === 'unsupportedCapability'
  );
  return verified ? 'giftcards-verified' : 'giftcards-unexpected';
}

/**
 * Validation routes for controller capabilities: stored payment methods, simultaneous
 * mounting, duplicate-type instances, and no-input submission. Every route runs on the
 * advanced flow and reports its state through the shared status label.
 */
const CapabilityValidation = ({
  scenario,
  onExit,
}: {
  scenario: CapabilityScenario;
  onExit: () => void;
}) => {
  const { advancedApi, configuration, navigateToResults } = useAppContext();
  const [status, setStatus] = useState('setting-up');
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [mounted, setMounted] = useState<Controller[]>([]);
  const [details, setDetails] = useState<string[]>([]);
  const [giftcards, setGiftcards] = useState<GiftcardProbe[]>([]);
  const phase = useRef<Phase>('store');
  const currentCheckout = useRef<Checkout | null>(null);
  const routeActive = useRef(true);
  const setupGeneration = useRef(0);

  /**
   * Resolves `null` when the route exited or a newer setup started while this one was pending.
   * `setupAdvanced` replaces the app-wide checkout, so a late setup must never run after exit,
   * and a checkout that finishes after exit is released at once instead of being kept.
   */
  const setup = useCallback(async (): Promise<Checkout | null> => {
    const generation = ++setupGeneration.current;
    const isCurrent = () =>
      routeActive.current && generation === setupGeneration.current;
    const paymentMethods = await advancedApi.paymentMethods(configuration);
    if (!isCurrent()) return null;
    const next = await AdyenCheckout.setupAdvanced(
      paymentMethods,
      checkoutConfiguration(configuration),
      {
        onSubmit: async (data: PaymentMethodData) => {
          const request =
            scenario === 'stored' && phase.current === 'store'
              ? { ...data, storePaymentMethod: true }
              : data;
          const result = await advancedApi.payments(
            request,
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
        onComplete: (result: PaymentResult) => {
          const resultCode = result.resultCode ?? ResultCode.error;
          if (scenario === 'stored' && phase.current === 'store') {
            setMounted([]);
            setStatus(
              resultCode === ResultCode.authorised
                ? 'stored-card-saved'
                : `stored-card-save-${resultCode}`
            );
            return;
          }
          setStatus(`terminal-${resultCode}`);
          navigateToResults({ ...result, resultCode });
        },
        onError: (error) => setStatus(`error-${errorCode(error)}`),
      }
    );
    if (!isCurrent()) {
      next.invalidate().catch(() => undefined);
      return null;
    }
    currentCheckout.current = next;
    setCheckout(next);
    return next;
  }, [advancedApi, configuration, navigateToResults, scenario]);

  const prepareStore = useCallback(async (next: Checkout) => {
    setMounted([await cardController(next)]);
    setStatus('stored-store-ready');
  }, []);

  const prepareMultiMount = useCallback(async (next: Checkout) => {
    const card = await cardController(next);
    // Prefer a second regular type; a stored payment method is a distinct supported method too.
    const candidates = [
      ...Array.from(next.paymentMethods.regular).filter(
        (paymentMethod) =>
          paymentMethod.type !== card.paymentMethod.type &&
          !WALLET_TYPES.has(paymentMethod.type)
      ),
      ...next.paymentMethods.stored,
    ];
    let second: Controller | null = null;
    const probed: string[] = [];
    for (const paymentMethod of candidates) {
      if (!(await next.isAvailable(paymentMethod))) {
        probed.push(`${paymentMethod.type}:unavailable`);
        continue;
      }
      const candidate = await next.createController(paymentMethod);
      probed.push(`${paymentMethod.type}:${candidate.requiresUserInteraction}`);
      if (candidate.requiresUserInteraction) {
        second = candidate;
        break;
      }
    }
    if (!second) {
      setDetails([probed.join(',')]);
      setStatus('multi-mount-no-second-method');
      return;
    }
    const kind = (controller: Controller) =>
      `${controller.paymentMethod.type}${
        next.paymentMethods.stored.first(
          (stored) => stored.id === controller.paymentMethod.id
        )
          ? '(stored)'
          : ''
      }`;
    setMounted([card, second]);
    setDetails([`${kind(card)}+${kind(second)}`, probed.join(',')]);
    setStatus(card !== second ? 'multi-mount-ready' : 'multi-mount-shared');
  }, []);

  const prepareGiftcards = useCallback(async (next: Checkout) => {
    const controllers = new Set<Controller>();
    const probes: GiftcardProbe[] = [];
    for (const paymentMethod of next.paymentMethods.regular) {
      if (paymentMethod.type === GIFTCARD_TYPE) {
        probes.push(await probeGiftcard(next, paymentMethod, controllers));
      }
    }
    const available = probes.filter((probe) => probe.available).length;
    setGiftcards(probes);
    setDetails([
      `count=${probes.length} available=${available} unavailable=${probes.length - available}`,
    ]);
    setStatus(giftcardStatus(probes));
  }, []);

  // Every no-input method of the test account (instant redirects and vouchers) completes only
  // through external UI, so the route records the candidates and skips the live completion.
  const prepareAutoSubmit = useCallback(async (next: Checkout) => {
    const candidates: string[] = [];
    for (const paymentMethod of next.paymentMethods.regular) {
      if (WALLET_TYPES.has(paymentMethod.type)) continue;
      if (!(await next.isAvailable(paymentMethod))) continue;
      const controller = await next.createController(paymentMethod);
      if (!controller.requiresUserInteraction) {
        candidates.push(paymentMethod.type);
      }
    }
    setDetails([`no-input=${candidates.join(',') || 'none'}`]);
    setStatus('auto-submit-skipped-by-environment');
  }, []);

  useEffect(() => {
    routeActive.current = true;
    const prepare = async () => {
      const next = await setup();
      if (!next) return;
      switch (scenario) {
        case 'stored':
          return prepareStore(next);
        case 'multi-mount':
          return prepareMultiMount(next);
        case 'giftcards':
          return prepareGiftcards(next);
        case 'auto-submit':
          return prepareAutoSubmit(next);
      }
    };
    prepare().catch((error) => setStatus(`setup-${errorCode(error)}`));
    return () => {
      routeActive.current = false;
      currentCheckout.current?.invalidate().catch(() => undefined);
    };
    // The route prepares exactly once and cleans up the checkout active when it unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStoredCard = useCallback(async () => {
    phase.current = 'pay';
    setMounted([]);
    setStatus('setting-up');
    const next = await setup();
    if (!next) return;
    const stored = Array.from(next.paymentMethods.stored).find(
      (paymentMethod) =>
        paymentMethod.type === 'scheme' &&
        (paymentMethod as StoredCardPaymentMethod).lastFour ===
          STORED_CARD_LAST_FOUR
    );
    setDetails([`stored=${next.paymentMethods.stored.length}`]);
    if (!stored) {
      setStatus('stored-method-missing');
      return;
    }
    const controller = await next.createController(stored);
    setMounted([controller]);
    setStatus(
      controller.paymentMethod.id === stored.id
        ? 'stored-controller-ready'
        : 'stored-controller-substituted'
    );
  }, [setup]);

  const submitMounted = useCallback(async () => {
    await mounted[0]?.submit();
  }, [mounted]);

  return (
    <ScrollView style={Styles.page} contentContainerStyle={Styles.padded}>
      <Status value={status} />
      <Button testID="validation-exit" title="Exit" onPress={onExit} />
      <Text testID={`validation-scenario-${scenario}`}>{scenario}</Text>
      {details.map((detail, index) => (
        <Text key={detail} testID={`validation-detail-${index}`}>
          {detail}
        </Text>
      ))}
      {giftcards.map((probe, index) => (
        <Text key={probe.id} testID={`validation-giftcard-${index}`}>
          {`${probe.id}|${probe.brand}|${probe.available ? 'available' : 'unavailable'}|${probe.outcome}`}
        </Text>
      ))}
      {mounted.map((controller, index) => (
        <View
          key={controller.paymentMethod.id}
          testID={`validation-mounted-${index}`}
          collapsable={false}
        >
          <Text testID={`validation-mounted-type-${index}`}>
            {controller.paymentMethod.type}
          </Text>
          {controller.requiresUserInteraction ? (
            <AdyenComponent controller={controller} />
          ) : null}
        </View>
      ))}
      {scenario === 'stored' ? (
        <>
          <Button
            testID="validation-stored-load"
            title="Load stored card"
            onPress={() => {
              loadStoredCard().catch((error) => {
                setStatus(`stored-${errorCode(error)}`);
              });
            }}
          />
          <Button
            testID="validation-stored-submit"
            title="Submit stored card"
            onPress={() => {
              submitMounted().catch((error) => {
                setStatus(`stored-submit-${errorCode(error)}`);
              });
            }}
          />
        </>
      ) : null}
      {scenario === 'giftcards' && checkout
        ? Array.from(checkout.paymentMethods.regular)
            .filter((paymentMethod) => paymentMethod.type === GIFTCARD_TYPE)
            .map((paymentMethod) => (
              <PaymentMethodComponent
                key={paymentMethod.id}
                checkout={checkout}
                paymentMethod={paymentMethod}
              />
            ))
        : null}
    </ScrollView>
  );
};

export default CapabilityValidation;
