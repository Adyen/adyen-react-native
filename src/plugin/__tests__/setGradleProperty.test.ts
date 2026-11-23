// Copyright (c) 2026 Adyen N.V.

import { describe, expect, test } from '@jest/globals';
import { setGradleProperty } from '../setGradleProperty';

describe('setGradleProperty', () => {
  test('adds a missing property at the end', () => {
    const items = [
      { type: 'comment' as const, value: 'Android settings' },
      { type: 'property' as const, key: 'newArchEnabled', value: 'true' },
    ];
    expect(setGradleProperty(items, 'adyen.skipR8Check', 'true')).toEqual([
      ...items,
      { type: 'property', key: 'adyen.skipR8Check', value: 'true' },
    ]);
  });

  test('replaces the value of an existing property', () => {
    const items = [
      { type: 'property' as const, key: 'adyen.skipR8Check', value: 'false' },
      { type: 'property' as const, key: 'other', value: '1' },
    ];
    expect(setGradleProperty(items, 'adyen.skipR8Check', 'true')).toEqual([
      { type: 'property', key: 'adyen.skipR8Check', value: 'true' },
      { type: 'property', key: 'other', value: '1' },
    ]);
  });

  test('does not change the given items', () => {
    const items = [{ type: 'property' as const, key: 'a', value: '1' }];
    setGradleProperty(items, 'b', '2');
    expect(items).toEqual([{ type: 'property', key: 'a', value: '1' }]);
  });
});
