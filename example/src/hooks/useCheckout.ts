//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { useEffect, useState } from 'react';
import type { Checkout } from '@adyen/react-native';

/**
 * Runs `setup` and tracks the resulting checkout. `setup` should be memoized with `useCallback`;
 * the checkout is set up again whenever it changes.
 */
export const useCheckout = (setup: () => Promise<Checkout>) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [checkout, setCheckout] = useState<Checkout | null>(null);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const result = await setup();
        if (active) {
          setCheckout(result);
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
  }, [setup]);

  return { loading, error, checkout };
};
