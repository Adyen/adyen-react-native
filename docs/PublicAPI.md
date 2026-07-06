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

Re-exported (as types) from `src/core/configurations/` via `src/core/index.ts`.

| Symbol | Kind | Source |
| --- | --- | --- |
| `Configuration` | interface | `configurations/Configuration.ts` |
| `BaseConfiguration` | interface | `configurations/Configuration.ts` |
| `EnvironmentConfiguration` | interface | `configurations/Configuration.ts` |
| `Environment` | type | `configurations/Configuration.ts` |
| `AnalyticsOptions` | interface | `configurations/Configuration.ts` |
| `ApplePayConfiguration` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingType` | type | `configurations/ApplePayConfiguration.ts` |
| `ApplePayAddressFields` | type | `configurations/ApplePayConfiguration.ts` |
| `ApplePaySummaryItem` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingMethod` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayPaymentContact` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayRecurringPaymentRequest` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayRecurringSummaryItem` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayCalendarUnit` | type | `configurations/ApplePayConfiguration.ts` |
| `ApplePayError` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingContactUpdateRequest` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayCouponCodeEvent` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayCouponCodeUpdateRequest` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayShippingMethodUpdateRequest` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayAuthorizationActions` | interface | `configurations/ApplePayConfiguration.ts` |
| `ApplePayPaymentAuthorization` | interface | `configurations/ApplePayConfiguration.ts` |
| `CardsConfiguration` | interface | `configurations/CardsConfiguration.ts` |
| `BinLookupData` | interface | `configurations/CardsConfiguration.ts` |
| `InstallmentPlan` | type | `configurations/CardsConfiguration.ts` |
| `InstallmentOption` | interface | `configurations/CardsConfiguration.ts` |
| `InstallmentOptions` | interface | `configurations/CardsConfiguration.ts` |
| `AddressMode` | type | `configurations/CardsConfiguration.ts` |
| `FieldVisibility` | type | `configurations/CardsConfiguration.ts` |
| `GooglePayConfiguration` | interface | `configurations/GooglePayConfiguration.ts` |
| `GooglePayShippingAddressParameters` | interface | `configurations/GooglePayConfiguration.ts` |
| `GooglePayBillingAddressParameters` | interface | `configurations/GooglePayConfiguration.ts` |
| `GooglePayBillingAddressFormat` | type | `configurations/GooglePayConfiguration.ts` |
| `TotalPriceStatus` | type | `configurations/GooglePayConfiguration.ts` |
| `CardAuthMethod` | type | `configurations/GooglePayConfiguration.ts` |
| `GooglePayEnvironment` | enum | `configurations/GooglePayConfiguration.ts` |
| `DropInConfiguration` | interface | `configurations/DropInConfiguration.ts` |
| `ThreeDSConfiguration` | interface | `configurations/ThreeDSConfiguration.ts` |
| `PartialPaymentConfiguration` | interface | `configurations/PartialPaymentConfiguration.ts` |
| `PartialPaymentComponent` | interface | `configurations/PartialPaymentConfiguration.ts` |
| `AddressLookup` | interface | `configurations/AddressLookup.ts` |
| `PostalAddress` | interface | `configurations/AddressLookup.ts` |
| `AddressLookupItem` | interface | `configurations/AddressLookup.ts` |

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
