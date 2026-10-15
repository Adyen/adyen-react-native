//
// Copyright (c) 2026 Adyen N.V.
//
// This file is open source and available under the MIT license. See the LICENSE file for more info.
//

import { describe, expect, test } from '@jest/globals';
import { createPaymentMethodsView } from '../paymentMethodsView';

const snapshotJson = JSON.stringify({
  paymentMethods: [
    { id: 'pm-scheme', type: 'scheme', name: 'Card', brands: ['visa', 'mc'] },
    { id: 'pm-gift-1', type: 'giftcard', name: 'Givex', brand: 'givex' },
    { id: 'pm-gift-2', type: 'giftcard', name: 'Plastix', brand: 'plastix' },
  ],
  storedPaymentMethods: [
    {
      id: 'stored-1',
      type: 'scheme',
      name: 'Stored card',
      supportedShopperInteractions: ['Ecommerce'],
    },
  ],
});

describe('createPaymentMethodsView', () => {
  test('groups regular and stored payment methods in their original order', () => {
    const view = createPaymentMethodsView(snapshotJson);

    expect(view.regular.length).toBe(3);
    expect(view.stored.length).toBe(1);
    expect([...view.regular].map((pm) => pm.id)).toEqual([
      'pm-scheme',
      'pm-gift-1',
      'pm-gift-2',
    ]);
    const iterated: string[] = [];
    for (const pm of view.stored) iterated.push(pm.id);
    expect(iterated).toEqual(['stored-1']);
  });

  test('can be iterated more than once', () => {
    const view = createPaymentMethodsView(snapshotJson);

    expect([...view.regular]).toHaveLength(3);
    expect([...view.regular]).toHaveLength(3);
  });

  test('first() returns the first element, the first match, or undefined', () => {
    const view = createPaymentMethodsView(snapshotJson);

    expect(view.regular.first()?.id).toBe('pm-scheme');
    expect(view.regular.first((pm) => pm.type === 'giftcard')?.id).toBe(
      'pm-gift-1'
    );
    expect(view.regular.first((pm) => pm.brand === 'plastix')?.id).toBe(
      'pm-gift-2'
    );
    expect(view.regular.first((pm) => pm.type === 'ideal')).toBeUndefined();
  });

  test('first() on an empty list returns undefined', () => {
    const view = createPaymentMethodsView('{"paymentMethods":[]}');

    expect(view.regular.length).toBe(0);
    expect(view.regular.first()).toBeUndefined();
    expect(view.stored.length).toBe(0);
    expect(view.stored.first()).toBeUndefined();
  });

  test('distinguishes instances of the same type by id', () => {
    const view = createPaymentMethodsView(snapshotJson);
    const giftcards = [...view.regular].filter((pm) => pm.type === 'giftcard');

    expect(giftcards).toHaveLength(2);
    expect(giftcards[0]!.id).not.toBe(giftcards[1]!.id);
  });

  test('is deeply immutable', () => {
    const view = createPaymentMethodsView(snapshotJson);
    const scheme = view.regular.first()!;

    expect(Object.isFrozen(view)).toBe(true);
    expect(Object.isFrozen(view.regular)).toBe(true);
    expect(Object.isFrozen(view.stored)).toBe(true);
    expect(Object.isFrozen(scheme)).toBe(true);
    expect(Object.isFrozen(scheme.brands)).toBe(true);
    expect(() => {
      (scheme as { name: string }).name = 'Changed';
    }).toThrow(TypeError);
    expect(() => {
      (scheme.brands as string[]).push('amex');
    }).toThrow(TypeError);
    expect(() => {
      (view as { regular: unknown }).regular = undefined;
    }).toThrow(TypeError);
    expect(() => {
      (view.regular as { length: number }).length = 0;
    }).toThrow(TypeError);
    expect(view.regular.first()?.name).toBe('Card');
    expect(view.regular.length).toBe(3);
  });

  test('exposes no array mutators on lists', () => {
    const view = createPaymentMethodsView(snapshotJson);

    expect(view.regular).not.toHaveProperty('push');
    expect(view.regular).not.toHaveProperty('splice');
  });

  test.each([
    ['missing regular id', '{"paymentMethods":[{"type":"scheme"}]}'],
    ['empty regular id', '{"paymentMethods":[{"id":"","type":"scheme"}]}'],
    ['blank regular id', '{"paymentMethods":[{"id":"  ","type":"scheme"}]}'],
    ['non-string id', '{"paymentMethods":[{"id":7,"type":"scheme"}]}'],
    [
      'duplicate regular ids',
      '{"paymentMethods":[{"id":"a","type":"giftcard"},{"id":"a","type":"giftcard"}]}',
    ],
    [
      'regular id colliding with a stored id',
      '{"paymentMethods":[{"id":"a","type":"scheme"}],"storedPaymentMethods":[{"id":"a","type":"scheme"}]}',
    ],
    [
      'stored entry without id',
      '{"paymentMethods":[],"storedPaymentMethods":[{"type":"scheme"}]}',
    ],
    ['non-object entry', '{"paymentMethods":["scheme"]}'],
    ['non-array group', '{"paymentMethods":{"id":"a"}}'],
    ['non-object payload', '[]'],
    ['malformed JSON', '{'],
  ])('rejects a snapshot with %s', (_, json) => {
    expect(() => createPaymentMethodsView(json)).toThrow(
      expect.objectContaining({
        code: 'invalidConfiguration',
        phase: 'setup',
      })
    );
  });

  test('accepts a snapshot without stored payment methods', () => {
    const view = createPaymentMethodsView(
      '{"paymentMethods":[{"id":"a","type":"scheme","name":"Card"}]}'
    );

    expect(view.regular.length).toBe(1);
    expect(view.stored.length).toBe(0);
  });
});
