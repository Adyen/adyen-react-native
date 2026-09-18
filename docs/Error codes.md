# Error codes

The public API has three different error shapes. Do not treat their fields as interchangeable.

| Surface                                                                                       | Shape                                                        | Code field                 |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------- |
| Native checkout event, delivered to `SessionCallbacks.onError` or `AdvancedCallbacks.onError` | `AdyenError` map with `message` and optional native metadata | Optional `error.errorCode` |
| React Native promise rejection                                                                | JavaScript `Error`                                           | `error.code`               |
| TypeScript validation before a native call                                                    | Ordinary `Error` or `TypeError`                              | No bridge code             |

An event map only has `errorCode` when the native error is a known coded error. Its absence is not a
code named `undefined`. On iOS this serialization is in
`ios/Model/Error.swift`; on Android it is in
`android/src/main/java/com/adyenreactnativesdk/util/ReactNativeError.kt`.

The first two sections below list all codes that can reach an event map or a public promise
rejection. The [flow guide](./public-api-flows.md) and
[feature matrix](./FeatureSupport.md) explain when their paths are reachable.

## Event `error.errorCode`

These codes can be present on native error events. The value comes from the native error
serialization, not from the rejected-promise code.

| Code                     | Reachable event path                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `canceledByShopper`      | iOS and Android cancellation, including Android headless-fragment closure |
| `notSupported`           | iOS Drop-in `start`/`action`, which emits a terminal checkout error       |
| `noClientKey`            | Android legacy Drop-in configuration failure                              |
| `invalidPaymentMethods`  | iOS component/context parsing and Android component/Drop-in parsing       |
| `invalidAction`          | iOS and Android action parsing routed through an event-producing module   |
| `noPaymentMethod`        | iOS component resolution and Android payment-method resolution            |
| `notKeyWindow`           | iOS presentation cannot find a root view controller                       |
| `componentNotRegistered` | iOS embedded-component proxy cannot find the registered view              |
| `unknown`                | Android uncoded checkout, context, or Drop-in failure                     |
| `noActivity`             | Android Drop-in starts without a registered launcher activity             |
| `noConsumer`             | Android embedded command has no registered `ComponentModule` consumer     |
| `noModuleListener`       | Android legacy Drop-in cannot find its service listener                   |

`message` is always the stable part of the event shape. A non-`KnownError` on iOS, or a
non-`KnownException` on Android, still emits a message but has no `errorCode`.

## Rejected-promise `error.code`

React Native turns a native rejection into a JavaScript `Error`; read its `.code`, not
`.errorCode`. These are the complete current public rejection codes.

| Code                      | Public API and platform                                                                                                                | Notes                                                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `session`                 | `AdyenCheckout.setup()` (iOS)                                                                                                          | Fixed code for invalid session input, configuration/setup failure, or an empty payment-method response. It masks any attached underlying error code.                   |
| `setup`                   | `AdyenCheckout.setupAdvanced()` (iOS)                                                                                                  | Fixed code for invalid payment methods and every later setup/configuration failure. It masks any attached underlying error code.                                       |
| `context`                 | `checkout.requiresUserInteraction()` (iOS)                                                                                             | Fixed when no native checkout context exists.                                                                                                                          |
| `requiresUserInteraction` | `checkout.requiresUserInteraction()` (iOS)                                                                                             | Fixed for component-resolution failure. It masks, for example, an underlying `noPaymentMethod`.                                                                        |
| `EUNSPECIFIED`            | `checkout.isAvailable()`, `checkout.requiresUserInteraction()`, `AdyenCheckout.setup()`, and `AdyenCheckout.setupAdvanced()` (Android) | These paths call React Native's one-argument `Promise.reject(Throwable)` overload, so React Native supplies its fallback code rather than the `ModuleException` code.  |
| `invalidAction`           | `AdyenAction.handle()` (Android)                                                                                                       | The action parser throws `ModuleException.InvalidAction`, which is rejected with its code.                                                                             |
| `noClientKey`             | `AdyenAction.handle()` (Android)                                                                                                       | The Android action configuration parser throws this known exception before setup.                                                                                      |
| `parsingError`            | `AdyenAction.handle()` (Android)                                                                                                       | Generic action or configuration parsing failure.                                                                                                                       |
| `canceledByShopper`       | `AdyenAction.handle()` (Android)                                                                                                       | An action-only checkout cancellation is converted to this code.                                                                                                        |
| `unknown`                 | `AdyenAction.handle()` (Android)                                                                                                       | A non-cancellation action-only checkout failure is converted to this code.                                                                                             |
| `invalidAction`           | `AdyenAction.handle()` (iOS)                                                                                                           | The action parser throws `ModuleException.invalidAction`, which the action module preserves.                                                                           |
| `noClientKey`             | `AdyenAction.handle()` (iOS)                                                                                                           | The action configuration parser throws `ModuleException.noClientKey`, which the action module preserves.                                                               |
| `notKeyWindow`            | `AdyenAction.handle()` (iOS)                                                                                                           | The action-only presentation delegate cannot find a root view controller.                                                                                              |
| `actionError`             | `AdyenAction.handle()` (iOS)                                                                                                           | Fixed fallback for a configuration, setup, or SDK error that is not a `ModuleException` and is not converted below. It masks an attached underlying `KnownError` code. |
| `canceledByShopper`       | `AdyenAction.handle()` (iOS)                                                                                                           | iOS maps component or 3DS cancellation to `ModuleException.canceled`.                                                                                                  |
| `invalidClientKey`        | `AdyenAction.handle()` (iOS)                                                                                                           | iOS maps an empty-401 networking response to `ModuleException.invalidClientKey`.                                                                                       |
| `Encryption failed`       | `AdyenCSE.encryptCard()` (iOS and Android), `AdyenCSE.encryptBin()` (Android)                                                          | Encryption failure.                                                                                                                                                    |
| `AdyenCSE`                | `AdyenCSE.encryptBin()` (iOS)                                                                                                          | iOS uses this fixed code for BIN encryption failure.                                                                                                                   |

`checkout.isAvailable()` normally resolves `false`; its Android Google Pay helper has a catch path
that uses the one-argument rejection overload, hence `EUNSPECIFIED` if that helper throws. The CSE
validation methods resolve booleans and do not reject.

### Fixed-code masking on iOS

`KnownError.errorCode` is not automatically the code of a rejected promise. For example,
`ApplePayError.invalidMerchantID` and `ApplePayError.invalidMerchantName` implement `KnownError`,
but `ContextModule.setup` rejects them as `session` or `setup`, and the action-only path rejects
them as `actionError`. Similarly, iOS `ModuleException.invalidPaymentMethods` and
`noPaymentMethod` can be attached to a context rejection while its promise `.code` remains one of
the fixed codes above. `AdyenAction.handle()` is different: it preserves an attached
`ModuleException` code, such as `invalidAction`, `noClientKey`, or `notKeyWindow`. Do not attribute
any other underlying value to a promise branch unless it independently reaches an event map.

The fixed branches are in `ios/Components/ContextModule.swift` (`session`, `setup`, `context`, and
`requiresUserInteraction`), `ios/CSE/ActionModule.swift` (`actionError` and the two explicit
conversions), and `ios/CSE/AdyenCSEModule.swift` (encryption). Android's explicit code overloads
are in `android/src/main/java/com/adyenreactnativesdk/cse/ActionModule.kt`; its context overloads
are in `android/src/main/java/com/adyenreactnativesdk/component/ContextModule.kt`.

## Exported `ErrorCode` enum

`ErrorCode` in `src/core/constants.ts` is a public declaration. It is not an exhaustive description
of current event or promise delivery, and it includes values that no reachable path currently
delivers.

| Exported value          | Current delivery status                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canceledByShopper`     | Delivered by event maps and standalone-action promise rejections as described above.                                                               |
| `notSupported`          | Delivered by the iOS Drop-in event path. Android defines, but does not instantiate, its counterpart.                                               |
| `noClientKey`           | Delivered by Android legacy Drop-in events and Android and iOS standalone-action rejections.                                                       |
| `noPayment`             | Declared only. No reachable current path produces it.                                                                                              |
| `invalidPaymentMethods` | Delivered by event maps; iOS setup promise branches mask it as `session` or `setup`.                                                               |
| `invalidAction`         | Delivered by event maps and Android and iOS standalone-action parse rejections.                                                                    |
| `notSupportedAction`    | Declared only. No reachable current path produces it.                                                                                              |
| `noPaymentMethod`       | Delivered by event maps; iOS `requiresUserInteraction()` masks it as `requiresUserInteraction`, and Android's context promise uses `EUNSPECIFIED`. |
| `sessionError`          | Declared only with this spelling. Session setup uses `session` on iOS and Android's context promise uses `EUNSPECIFIED`.                           |

The non-enum codes in the preceding tables, including `session`, `setup`, `context`,
`requiresUserInteraction`, `EUNSPECIFIED`, `actionError`, `parsingError`, `Encryption failed`,
`AdyenCSE`, `unknown`, `notKeyWindow`, `componentNotRegistered`, `noConsumer`, `noActivity`, and
`noModuleListener`, are public delivery values too. Handle them as strings and only on the
surface and platform shown above.
