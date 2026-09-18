# Error codes

Errors surface to your `onError` callback (both the advanced `AdvancedCallbacks` and the `SessionCallbacks`
expose `onError(error: AdyenError)`; the session flow routes through the internal
`didSessionErrorCallback` event) or reject a public promise (for example `AdyenAction.handle`) as an
`AdyenError` object with a `message` and an `errorCode` string.

The `errorCode` values your app can receive are defined by the public `ErrorCode` enum
(`src/core/constants.ts`) plus a set of native-only codes that the bridge forwards without a
matching enum member. Not every enum member is actually produced by the current native code, and
some native failures carry **no** `errorCode` at all — a native error that is not a known,
coded exception is delivered with `message` set and `errorCode` `undefined` (iOS `Model/Error.swift`,
Android `util/ReactNativeError.kt`). For the flows and platforms that produce these errors see
[public-api-flows.md](./public-api-flows.md) and [FeatureSupport.md](./FeatureSupport.md).

## Public `ErrorCode` values

These are the members of the exported `ErrorCode` enum. The "Emitted by" column records whether the
current native code actually delivers the value.

| `errorCode`             | Meaning                                                                | Emitted by                                                                                                                         |
| ----------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `canceledByShopper`     | Payment canceled by the shopper (or a canceled 3D Secure 2 challenge). | iOS and Android, all presenters.                                                                                                   |
| `notSupported`          | The requested path is not supported on the current platform.           | iOS only, from Drop-in `start`/`action`. The Android `NotSupported` case is defined but never instantiated.                        |
| `noClientKey`           | Missing `clientKey` in configuration.                                  | iOS and Android, during configuration parsing. In the Android session setup path it can be re-wrapped as `session`.                |
| `noPayment`             | Missing or invalid `amount`/`countryCode` in configuration.            | **Declared-only.** The Android `NoPayment` case is never instantiated and iOS has no equivalent, so this value is never delivered. |
| `invalidPaymentMethods` | Cannot parse `paymentMethods`, or the list is empty.                   | iOS and Android.                                                                                                                   |
| `invalidAction`         | Cannot parse the action.                                               | iOS and Android.                                                                                                                   |
| `notSupportedAction`    | The component does not support action handling.                        | **Declared-only.** No layer produces this value.                                                                                   |
| `noPaymentMethod`       | Cannot find the selected payment-method type in the provided list.     | iOS (`paymentMethodNotFound`) and Android (`NoPaymentMethod`).                                                                     |
| `sessionError`          | Session failed to be created.                                          | **Never delivered with this spelling.** Session-creation failures deliver the `session` code (see below).                          |

## Additional native codes

These reach an error callback or reject a public promise but are **not** members of the `ErrorCode`
enum. Handle them by string.

| `errorCode`              | Platform        | Meaning                                                                                                                                                                        | Source                                                                                                                       |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `session`                | iOS and Android | Something went wrong while starting the session. This is the value actually delivered for session-creation failures, not `sessionError`.                                       | Android `ModuleException.SessionError` (`code = "session"`); iOS rejects `createSession()` with the reject code `"session"`. |
| `unknown`                | Android         | Catch-all for an uncoded failure, including a non-cancel `CheckoutError` and the "checkout not initialized" and "Drop-in session flow not yet supported in v6 alpha" branches. | Android `ModuleException.Unknown`, `CheckoutErrorExt.toModuleException`.                                                     |
| `notKeyWindow`           | iOS             | No root view controller was available to present on.                                                                                                                           | iOS `ModuleException.notKeyWindow`.                                                                                          |
| `componentNotRegistered` | iOS             | No embedded component was registered for the requested view id.                                                                                                                | iOS `ModuleException.componentNotRegistered` (embedded `<AdyenComponent>` proxy).                                            |
| `invalidClientKey`       | iOS             | The backend returned an empty 401 (interpreted as an invalid client key). Reachable through the standalone `AdyenAction` reject path.                                          | iOS `ModuleException.invalidClientKey` via `ModuleException.checkErrorType`.                                                 |
| `noConsumer`             | Android         | No embedded view is registered in `ComponentModule` under the requested id.                                                                                                    | Android `ModuleException.NoConsumer`.                                                                                        |
| `noActivity`             | Android         | The Drop-in launcher activity was not registered (`AdyenCheckout.setLauncherActivity()`).                                                                                      | Android `ModuleException.NoActivity`.                                                                                        |
| `noModuleListener`       | Android         | No `DropInService` is registered for the current (session/advanced) integration.                                                                                               | Android `ModuleException.NoModuleListener` (legacy Drop-in wiring).                                                          |
| `invalidMerchantID`      | iOS             | Apple Pay is configured without a `merchantID`. Rejects the setup promise.                                                                                                     | iOS `ApplepayConfigurationParser`.                                                                                           |
| `invalidMerchantName`    | iOS             | Apple Pay is configured without a `merchantName` or `summaryItems`. Rejects the setup promise.                                                                                 | iOS `ApplepayConfigurationParser`.                                                                                           |

> [!NOTE]
> The `session`/`sessionError` mismatch is real: the TypeScript `ErrorCode` enum spells the value
> `sessionError`, but both platforms deliver `session` for a session-creation failure. Compare
> `error.errorCode` against `'session'` for that case.

## Codes that exist in source but are never delivered

For completeness, the following native cases are defined but never instantiated, so they cannot
reach your app in the current build: Android `NotSupported`, `NoPayment`, `NoPaymentMethods`
(the plural variant), `WrongFlow`, and `NoPaymentRegistered`; iOS `sessionError`, and the Drop-in
`balanceCheck`/`orderRequest` cases (their only call sites are in the disabled
`DropInModule+Delegates.swift`). Apple Pay runtime failures do not produce a dedicated code — a
rejected authorization is delivered as the Apple Pay result payload from your `onAuthorize` handler,
not as an `errorCode`.
