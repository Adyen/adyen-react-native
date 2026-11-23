// Copyright (c) 2026 Adyen N.V.

import type { AndroidConfig } from '@expo/config-plugins';

type PropertiesItem = AndroidConfig.Properties.PropertiesItem;

/** Sets a property in the items of `android/gradle.properties`, replacing an existing value. */
export function setGradleProperty(
  items: PropertiesItem[],
  key: string,
  value: string
): PropertiesItem[] {
  const exists = items.some(
    (item) => item.type === 'property' && item.key === key
  );
  if (exists) {
    return items.map((item) =>
      item.type === 'property' && item.key === key ? { ...item, value } : item
    );
  }
  return [...items, { type: 'property', key, value }];
}
