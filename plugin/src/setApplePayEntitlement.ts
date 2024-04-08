// MIT License
//
// Copyright (c) 2020 stripe

export function setApplePayEntitlement(
    merchantIdentifiers: string | string[],
    entitlements: Record<string, any>
  ): Record<string, any> {
    const key = 'com.apple.developer.in-app-payments';
  
    const merchants: string[] = entitlements[key] ?? [];
  
    if (!Array.isArray(merchantIdentifiers)) {
      merchantIdentifiers = [merchantIdentifiers];
    }
  
    for (const id of merchantIdentifiers) {
      if (id && !merchants.includes(id)) {
        merchants.push(id);
      }
    }
  
    if (merchants.length) {
      entitlements[key] = merchants;
    }
    return entitlements;
  }