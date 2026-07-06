# Public API

The package's public API is the set of symbols re-exported through `src/index.ts` (barrel: `./components`, `./core`, `./hooks`, `./modules`). This document is the canonical list of those exports.

> **Keeping this document in sync is mandatory** — see `AGENTS.md` → "Public API". When the barrels change, update this document in the same PR. Symbols not listed here are internal and must not be re-exported through `src/index.ts`.

## Components

Re-exported from `src/components/index.ts`.

| Symbol | Kind | Source |
| --- | --- | --- |
| `AdyenCheckout` | React component | `components/AdyenCheckout.tsx` |
| `AdyenCheckoutProps` | type | `components/AdyenCheckout.tsx` |
| `ApplePayButton` | React component | `components/ApplePayButton.tsx` |
| `ApplePayButtonProps` | interface | `components/ApplePayButton.tsx` |
| `ApplePayButtonTheme` | const object | `components/ApplePayButton.tsx` |
| `ApplePayButtonType` | const object | `components/ApplePayButton.tsx` |
| `GooglePayButton` | React component | `components/GooglePayButton.tsx` |
| `GooglePayButtonProps` | interface | `components/GooglePayButton.tsx` |
| `GooglePayButtonTheme` | const object | `components/GooglePayButton.tsx` |
| `GooglePayButtonType` | const object | `components/GooglePayButton.tsx` |
| `CardView` | React component | `components/CardView.tsx` |
| `CardViewProps` | interface | `components/CardView.tsx` |

## Hooks

Re-exported from `src/hooks/index.ts`.

| Symbol | Kind | Source |
| --- | --- | --- |
| `useAdyenCheckout` | function (hook) | `hooks/useAdyenCheckout.ts` |
| `AdyenCheckoutContextType` | type | `hooks/useAdyenCheckout.ts` |

## Core Types & Interfaces

Re-exported (as types) from `src/core/types.ts` via `src/core/index.ts`.

| Symbol | Kind |
| --- | --- |
| `PaymentAction` | interface |
| `PaymentMethod` | interface |
| `PaymentMethodGroup` | interface |
| `StoredPaymentMethod` | interface |
| `PaymentMethodsResponse` | interface |
| `PaymentAmount` | interface |
| `PaymentMethodData` | interface |
| `PaymentDetailsData` | interface |
| `SessionConfiguration` | interface |
| `AdyenError` | interface |
| `SubmitModel` | interface |
| `Balance` | interface |
| `Order` | interface |
| `SessionsResult` | type |
| `HideOption` | interface |
| `AdyenComponent` | interface |
| `AdyenActionComponent` | interface |
| `ConditionalPaymentComponent` | interface |

## Configurations

Re-exported (as types) from `src/core/configurations/` via `src/core/index.ts`. The configurations barrel uses `export type *`, so all symbols below are **type-only** — they can be used in type annotations but not as runtime values.

| Symbol | Kind | Source |
| --- | --- | --- |
| `Configuration` | interface | `core/configurations/Configuration.ts` |
| `BaseConfiguration` | interface | `core/configurations/Configuration.ts` |
| `EnvironmentConfiguration` | interface | `core/configurations/Configuration.ts` |
| `Environment` | type | `core/configurations/Configuration.ts` |
| `AnalyticsOptions` | interface | `core/configurations/Configuration.ts` |
| `ApplePayConfiguration` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingType` | type | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayAddressFields` | type | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePaySummaryItem` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingMethod` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayPaymentContact` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayRecurringPaymentRequest` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayRecurringSummaryItem` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayCalendarUnit` | type | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayError` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingContactUpdateRequest` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayCouponCodeEvent` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayCouponCodeUpdateRequest` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingMethodUpdateRequest` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayAuthorizationActions` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `ApplePayPaymentAuthorization` | interface | `core/configurations/ApplePayConfiguration.ts` |
| `CardsConfiguration` | interface | `core/configurations/CardsConfiguration.ts` |
| `BinLookupData` | interface | `core/configurations/CardsConfiguration.ts` |
| `InstallmentPlan` | type | `core/configurations/CardsConfiguration.ts` |
| `InstallmentOption` | interface | `core/configurations/CardsConfiguration.ts` |
| `InstallmentOptions` | interface | `core/configurations/CardsConfiguration.ts` |
| `AddressMode` | type | `core/configurations/CardsConfiguration.ts` |
| `FieldVisibility` | type | `core/configurations/CardsConfiguration.ts` |
| `GooglePayConfiguration` | interface | `core/configurations/GooglePayConfiguration.ts` |
| `GooglePayShippingAddressParameters` | interface | `core/configurations/GooglePayConfiguration.ts` |
| `GooglePayBillingAddressParameters` | interface | `core/configurations/GooglePayConfiguration.ts` |
| `GooglePayBillingAddressFormat` | type | `core/configurations/GooglePayConfiguration.ts` |
| `TotalPriceStatus` | type | `core/configurations/GooglePayConfiguration.ts` |
| `CardAuthMethod` | type | `core/configurations/GooglePayConfiguration.ts` |
| `GooglePayEnvironment` | enum (type-only) | `core/configurations/GooglePayConfiguration.ts` |
| `DropInConfiguration` | interface | `core/configurations/DropInConfiguration.ts` |
| `ThreeDSConfiguration` | interface | `core/configurations/ThreeDSConfiguration.ts` |
| `PartialPaymentConfiguration` | interface | `core/configurations/PartialPaymentConfiguration.ts` |
| `PartialPaymentComponent` | interface | `core/configurations/PartialPaymentConfiguration.ts` |
| `AddressLookup` | interface | `core/configurations/AddressLookup.ts` |
| `PostalAddress` | interface | `core/configurations/AddressLookup.ts` |
| `AddressLookupItem` | interface | `core/configurations/AddressLookup.ts` |

## Constants & Enums

Re-exported from `src/core/constants.ts` and `src/core/components.ts` via `src/core/index.ts`.

| Symbol | Kind | Source |
| --- | --- | --- |
| `Event` | enum | `core/constants.ts` |
| `ErrorCode` | enum | `core/constants.ts` |
| `ResultCode` | enum | `core/constants.ts` |
| `BalanceResultCode` | enum | `core/constants.ts` |
| `UNSUPPORTED_PAYMENT_METHODS` | const array | `core/components.ts` |
| `ADDRESS_COMPONENTS` | const array | `core/components.ts` |
| `NATIVE_COMPONENTS` | const array | `core/components.ts` |

## Module Wrappers

Re-exported from `src/modules/index.ts`.

| Symbol | Kind | Source |
| --- | --- | --- |
| `AdyenApplePay` | const (`ApplePayModule`) | `modules/applepay/AdyenApplePay.ts` |
| `ApplePayModule` | interface | `modules/applepay/AdyenApplePay.ts` |
| `AdyenGooglePay` | const (`GooglePayModule`) | `modules/googlepay/AdyenGooglePay.ts` |
| `GooglePayModule` | interface | `modules/googlepay/AdyenGooglePay.ts` |
| `AdyenInstant` | const (`InstantModule`) | `modules/instant/AdyenInstant.ts` |
| `InstantModule` | interface | `modules/instant/AdyenInstant.ts` |
| `AdyenDropIn` | const (`DropInModule`) | `modules/dropin/AdyenDropIn.ts` |
| `DropInModule` | interface | `modules/dropin/AdyenDropIn.ts` |
| `AdyenAction` | const (`ActionModule`) | `modules/action/AdyenAction.ts` |
| `ActionModule` | interface | `modules/action/AdyenAction.ts` |
| `AdyenCSE` | const (`AdyenCSEModule`) | `modules/cse/AdyenCSEModule.ts` |
| `AdyenCSEModule` | interface | `modules/cse/AdyenCSEModule.ts` |
| `Card` | class | `modules/cse/types.ts` |

## Internal (not exported)

The following are intentionally **not** part of the public API and must not be re-exported through `src/index.ts`:

- `modules/session/*` — `SessionHelper`, `SessionWrapper`, `SessionHelperModule`, `SessionContext` (used internally by `AdyenCheckout`).
- `modules/embedded/*` — `EmbeddedComponentBus`, `EmbeddedComponentBusWrapper`, `EmbeddedComponentProxy`, `EmbeddedNativeModule` (used internally by `CardView`).
- `modules/base/*` — `EventListenerWrapper`, `ModuleWrapper`, `PaymentComponentWrapper`, `ActionHandlingComponentWrapper`, `AddressLookupModule`, `ModuleMock`, `getWrapper`, `find`, and base constants.
- `modules/applepay/ApplePayInternalTypes.ts` — `ApplePayAuthorizationResult`.
- `components/utils/*`, `components/common/*` — internal helpers and styles.
