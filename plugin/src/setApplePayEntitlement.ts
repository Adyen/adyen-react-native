const in_app_payment_key = 'com.apple.developer.in-app-payments';

export function setApplePayEntitlement(
  entitlements: any,
  newIdentifiers: string | string[]
): string {
  const identifiers: string[] = entitlements[in_app_payment_key] ?? [];
  const identifiersToSet = Array.isArray(newIdentifiers)
    ? newIdentifiers
    : [newIdentifiers];

  identifiersToSet
    .filter((id) => id && identifiers.includes(id))
    .forEach((id) => identifiers.push(id));

  if (identifiers.length) {
    entitlements[in_app_payment_key] = identifiers;
  }
  return entitlements;
}
