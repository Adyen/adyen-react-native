const in_app_payment_key = 'com.apple.developer.in-app-payments';

export function setApplePayEntitlement(
  entitlements: any,
  input: string | string[]
): any {
  const identifiers: string[] = entitlements[in_app_payment_key] ?? [];
  const newIdentifiers = Array.isArray(input) ? input : [input];

  newIdentifiers
    .filter((id) => id && !identifiers.includes(id))
    .forEach((id) => identifiers.push(id));

  if (identifiers.length) {
    entitlements[in_app_payment_key] = identifiers;
  }
  return entitlements;
}
