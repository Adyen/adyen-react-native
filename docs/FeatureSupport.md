# Feature Support

The single capability authority for the `@adyen/react-native` v6-alpha bridge. It records what is
actually reachable at runtime per platform, flow, and presenter — not what a TypeScript property,
configuration parser, or native declaration merely advertises. For the lifecycle contract see
[Architecture.md](./Architecture.md), for the native internals
[native-architecture.md](./native-architecture.md), and for the chronological sequences
[public-api-flows.md](./public-api-flows.md).

> [!IMPORTANT]
> A declared option does not imply runtime support. Several capabilities have TypeScript props,
> configuration keys, or parser branches that are wired incompletely or route to a legacy
> implementation. Where a declaration exists without a reachable runtime path, the status below is
> `declared-only / nonfunctional` or `legacy-backed`, never `supported`.

## Status legend

| Status                            | Meaning                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **supported**                     | A reachable v6 runtime path exists and reaches its intended outcome, subject to any noted method/device gate. |
| **unsupported**                   | The path ends in an explicit error (or no-op) before it can succeed; no successful outcome is reachable.      |
| **legacy-backed**                 | Reachable only through the pre-v6 (`com.adyen.checkout.*.old`) implementation, with the noted limitations.    |
| **declared-only / nonfunctional** | A type, prop, parser branch, or method exists but has no reachable runtime effect in this bridge.             |

## Platform, flow, and presenter matrix

Statuses below match the branches in [public-api-flows.md](./public-api-flows.md). "Subject to
availability" means the payment method must be present and, for wallets, pass the device check
described under [Payment-method and wallet capabilities](#payment-method-and-wallet-capabilities).

| Presenter                    | Flow     | iOS                                     | Android                                   |
| ---------------------------- | -------- | --------------------------------------- | ----------------------------------------- |
| Embedded `<AdyenComponent>`  | Session  | supported (subject to availability)     | supported (subject to availability)       |
| Embedded `<AdyenComponent>`  | Advanced | supported (subject to availability)     | supported (subject to availability)       |
| Headless `checkout.submit()` | Session  | supported (subject to availability)     | supported (subject to availability)       |
| Headless `checkout.submit()` | Advanced | supported (subject to availability)     | supported (subject to availability)       |
| Drop-in                      | Session  | **unsupported** (`notSupported`)        | **unsupported** (explicit v6-alpha error) |
| Drop-in                      | Advanced | **unsupported** (`notSupported`)        | **legacy-backed** (`dropin.old`)          |
| Standalone `AdyenAction`     | n/a      | supported (payload differs — see below) | supported (payload differs — see below)   |

Notes:

- **Embedded and headless** session/advanced flows are supported on both platforms. The v6
  suspension, continuation, terminal, and cleanup order is in
  [public-api-flows.md](./public-api-flows.md); the routing internals are in
  [native-architecture.md](./native-architecture.md#continuation-ownership-and-routing).
- **iOS Drop-in** returns `ModuleException.notSupported` from `DropInModule.start(_:)` and
  `action(_:)` without presenting. The Drop-in-specific JS subscriptions omit `core`, but React
  Native observes native events globally by name, so the checkout terminal error listener still
  delivers the merchant `onError` and runs context cleanup.
- **Android session Drop-in** emits `"Drop-in session flow not yet supported in v6 alpha"` from
  `DropInModule.start` after the background task has already started and never presents the launcher.
  The error is globally observed, so the checkout terminal error callback and context cleanup run —
  but that cleanup leaves the Drop-in background task unfinished.
- **Android advanced Drop-in** is the only legacy-backed path: it converts to
  `com.adyen.checkout.dropin.old` types and launches through `dropin.old.DropIn.startPayment` with an
  `AdvancedCheckoutService`. Its critical limitation is that normal return-based merchant results
  dispatch through `NativeCheckout`/`ContextModule`, not `DropInModule`: `action` and `retry` stall
  the legacy service, and `completion` tears down the checkout context without resolving the legacy
  service or finishing its background task unless `DropInModule.completion()`/`retry()` are called
  directly. See [Legacy Drop-in limitations](#legacy-drop-in-limitations).
- **Standalone action** is supported on both platforms with a payload difference: iOS may resolve
  either the additional-details data or an `onComplete` result-code object, whereas Android resolves
  only the additional-details data and otherwise rejects. See
  [public-api-flows.md](./public-api-flows.md#standalone-action).

### Ambiguous routing caveat (Android)

Embedded and headless managers can coexist and await results simultaneously on Android, and
continuation commands carry no presenter identity, so `awaitingManager()` routes to the first
awaiting map entry. Same-type embedded and headless managers can also replace one another in the
type-keyed routing map. Deterministic presenter routing is therefore not guaranteed in this case —
see [public-api-flows.md](./public-api-flows.md#concurrent-continuation-ambiguity-android).

## Payment-method and wallet capabilities

| Capability            | iOS                                                             | Android                                                                                                                   |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Apple Pay             | supported (limited to iOS; PassKit device check)                | **unsupported** (`isAvailable` resolves `false` for `applepay`)                                                           |
| Google Pay            | **unsupported** (`isAvailable` resolves `false` for Google Pay) | limited Android availability: `false` without a matching method; otherwise the TODO helper returns `true` unconditionally |
| BIN callbacks         | supported checkout-wide (card configuration)                    | supported for the embedded `scheme` view only; **not** wired for headless submit                                          |
| Partial payments      | declared-only / nonfunctional                                   | legacy-backed (Drop-in only)                                                                                              |
| Stored-method removal | declared-only / nonfunctional                                   | legacy plumbing, not enabled by the compatibility builder                                                                 |
| Address lookup        | falls back to full address mode when no lookup handler is wired | v6 card lookup/full unsupported; embedded address commands inert; incomplete legacy plumbing                              |

### Apple Pay and Google Pay

Apple Pay is limited to iOS and Google Pay to Android. On iOS,
`ContextModule.isAvailable` resolves `false` for Google Pay and, for Apple Pay, requires both a
matching payment method and `PKPaymentAuthorizationViewController.canMakePayments()`. On Android,
`ContextModule.isAvailable` resolves `false` for `applepay`; for a Google Pay key, it first requires
an exact matching payment method. If present, it calls
`android/src/main/java/com/adyenreactnativesdk/component/googlepay/GooglePayAvailability.kt`, whose
current TODO implementation returns `true` unconditionally. It does not check real device capability.

### BIN callbacks

`onBinLookup` / `onBinValue` are configured on the card configuration, which makes them
checkout-level rather than per presenter. On iOS they are wired checkout-wide:
`ContextModule.buildCheckoutConfiguration` constructs `CardConfigurationParser` with `onBinChange` and
`onBinLookup`, so any card presenter emits them. On Android they are wired **only** for an embedded
`scheme` view (`AdyenComponentViewState.renderView` adds the `card(onBinChange, onBinLookup)` block
only when `paymentMethodType == "scheme"`); headless `ContextModule.resolveController` builds its
`ComponentManager` with no card callback block, so headless submit emits no BIN events. The legacy
Drop-in service forwards `onBinValue` but leaves `onBinLookup` as a TODO (value-only). Drop-in BIN on
iOS is unavailable because iOS Drop-in never presents.

### Partial payments

Partial payments are not fully supported. On iOS the Drop-in delegate conformances that would drive
balance/order handling are disabled (`DropInModule+Delegates.swift`), and the wrapper methods
(`provideBalance`, `provideOrder`) exist only as declared-only plumbing. On Android the balance/order
messengers are reachable only through the legacy advanced Drop-in service
(`AdvancedCheckoutService.onBalanceCheck` / `onOrderRequest` / `onOrderCancel`), so partial payments
are legacy-backed and limited by the legacy Drop-in limitations below. The TypeScript
`partialPayment` configuration and `DropInWrapper` methods are marked `// TODO: v6 alpha - not yet
supported`.

### Stored-method removal

On iOS, stored-method removal is declared-only/nonfunctional: `DropInModule.removeStored` forwards to
a `disableStoredPaymentMethodHandler` that is never installed (the enabling delegate conformances are
disabled). On Android, removal is reachable only as legacy plumbing through the old Drop-in service
(`AdvancedCheckoutService.onRemoveStoredPaymentMethod` → `DropInModule.removeStored` →
`RecurringDropInServiceResult`), and the compatibility builder does not enable it — see
[Legacy Drop-in limitations](#legacy-drop-in-limitations).

### Address lookup

- **iOS**: `ContextModule.buildCheckoutConfiguration` constructs `CardConfigurationParser` without an
  `onAddressLookup` handler. When a merchant sets card address mode to `"lookup"`, the parser's
  guard falls back to `.full(...)` (`CardConfigurationParser.billingAddressMode`), so lookup mode
  degrades to full address entry rather than a live lookup.
- **Android**: v6 card lookup/full address is not wired into the embedded or headless card path
  (`AdyenComponentViewState` wires only BIN callbacks for card views). The embedded address commands
  on `DropInWrapper` (`update`, `confirm`, `reject`) route to the legacy Drop-in service, so they are
  inert outside legacy Drop-in. Legacy address lookup plumbing exists in `AdvancedCheckoutService`
  (`onAddressLookupQueryChanged` / `onAddressLookupCompletion`) but is part of the incomplete legacy
  Drop-in implementation.

## Legacy Drop-in limitations

Android advanced Drop-in is legacy-backed and must not be read as fully supported. Its compatibility
configuration builder (`DropInModule.buildOldCheckoutConfiguration`) forwards only:

- `environment` (mapped from the v6 environment by matching the checkout base URL),
- `clientKey`,
- `shopperLocale`,
- `amount`.

No v6 card, Drop-in, Google Pay, 3DS, partial-payment, stored-removal, or address configuration is
mapped into the old launcher by that builder, so any such capability is available only if the old
launcher's own defaults reach it — not because this bridge forwards the v6 configuration. Normal
return-based merchant results dispatch through `NativeCheckout`/`ContextModule`, not `DropInModule`,
so `action`/`retry` stall the legacy service and `completion` tears down the checkout context
without resolving it. The background task is finished only by a direct `DropInModule.completion()`/
`retry()` call, not by the normal return-based results, the cancellation/error/final-result
callbacks, or generic context cleanup (see
[public-api-flows.md](./public-api-flows.md#legacy-drop-in-task-termination)).

## Declared vs. reachable

The following are examples where a declaration exists but does not establish runtime support, so the
matrix above reads them as `declared-only / nonfunctional` or `legacy-backed`:

- `DropInWrapper.removeStored` / `provideBalance` / `provideOrder` / `providePaymentMethods` carry
  `// TODO: v6 alpha - not yet supported`.
- iOS `DropInModule` delegate conformances are disabled with an explanatory `TODO`, and `start(_:)` /
  `action(_:)` emit `notSupported`.
- The `partialPayment` and Drop-in configuration types are fully typed in `src/core` but reach only
  the legacy Android Drop-in path or nothing at all.

No TypeScript property, parser declaration, or configuration type alone establishes runtime support;
the status is determined by the reachable native path.
