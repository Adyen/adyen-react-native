# Architecture

## Directory Structure

```
src/
├── index.ts                    # Main entry point (barrel exports)
├── components/                 # React components
│   ├── index.ts
│   ├── AdyenCheckout.tsx       # Main checkout component with context provider
│   ├── ApplePayButton.tsx      # Apple Pay button component
│   ├── GooglePayButton.tsx     # Google Pay button component
│   ├── utils.ts                # Validation utilities
│   └── common/
│       └── Styles.ts           # Shared styles
├── core/                       # Core types, constants, and configurations
│   ├── index.ts
│   ├── types.ts                # Payment types and component interfaces
│   ├── constants.ts            # Event enums and constants
│   ├── components.ts           # Payment method component mappings
│   └── configurations/         # Configuration interfaces
│       ├── index.ts
│       ├── Configuration.ts
│       ├── AddressLookup.ts
│       ├── ApplePayConfiguration.ts
│       ├── CardsConfiguration.ts
│       ├── DropInConfiguration.ts
│       ├── GooglePayConfiguration.ts
│       ├── PartialPaymentConfiguration.ts
│       └── ThreeDSConfiguration.ts
├── hooks/                      # React hooks
│   ├── index.ts
│   └── useAdyenCheckout.ts     # Context hook for checkout state
└── modules/                    # Native module wrappers
    ├── index.ts
    ├── base/                   # Base wrapper classes
    │   ├── EventListenerWrapper.ts
    │   ├── ModuleWrapper.ts
    │   ├── ActionHandlingComponentWrapper.ts
    │   ├── ModuleMock.ts
    │   ├── constants.ts
    │   ├── getWrapper.ts
    │   └── utils.ts
    ├── action/                 # Standalone action handler
    │   ├── AdyenAction.ts
    │   └── ActionModuleWrapper.ts
    ├── applepay/               # Apple Pay module
    │   ├── AdyenApplePay.ts
    │   └── ApplePayWrapper.ts
    ├── cse/                    # Client-side encryption
    │   ├── AdyenCSEModule.ts
    │   ├── AdyenCSEModuleWrapper.ts
    │   └── Card.ts
    ├── dropin/                 # Drop-in module
    │   ├── AdyenDropIn.ts
    │   └── DropInWrapper.ts
    ├── googlepay/              # Google Pay module
    │   ├── AdyenGooglePay.ts
    │   └── GooglePayWrapper.ts
    ├── instant/                # Instant/redirect payments
    │   ├── AdyenInstant.ts
    │   └── InstantWrapper.ts
    └── session/                # Session management
        ├── SessionHelperModule.ts
        └── SessionWrapper.ts
```

## Class Hierarchy

### Wrapper Classes

```
NativeModule (react-native)
    │
    ▼
EventListenerWrapper<T>              # Abstract - manages event subscriptions
    │
    ▼
ModuleWrapper<T>                     # Abstract - adds open/hide functionality
    │                                  implements AdyenPaymentComponent
    │
    ├──► ApplePayWrapper             # implements ApplePayModule
    │
    └──► ActionHandlingComponentWrapper<T>    # Abstract - adds action handling
                │                               implements AdyenActionComponent
                │
                ├──► DropInWrapper            # implements DropInModule, AddressLookup,
                │                               RemovesStoredPayment, PartialPaymentComponent
                │
                ├──► GooglePayWrapper         # implements GooglePayModule
                │
                └──► InstantWrapper           # implements InstantModule
```

### Standalone Wrappers (not in hierarchy)

```
ActionModuleWrapper                  # implements ActionModule
AdyenCSEWrapper                      # implements AdyenCSEModule
SessionWrapper                       # implements SessionHelperModule
```

## Interface Dependencies

### Core Component Interfaces (`core/types.ts`)

```
AdyenComponent                       # Base: hide()
    │
    └──► ConditionalPaymentComponent # Adds: isAvailable()

AdyenPaymentComponent                # open()

AdyenActionComponent                 # handle()

RemovesStoredPayment                 # removeStored()
```

### Native Module Interfaces

```
NativeModule (react-native)
    │
    ├──► BaseNativeModule            # extends AdyenComponent
    │       │                          Adds: open(), hide()
    │       │
    │       ├──► ApplePayNativeModule    # Adds: isAvailable()
    │       │
    │       └──► ActionHandlingNativeModule   # Adds: handle()
    │               │
    │               ├──► DropInNativeModule   # Adds: getReturnURL(), removeStored(),
    │               │                           update(), confirm(), provideBalance(),
    │               │                           provideOrder(), providePaymentMethods()
    │               │
    │               └──► GooglePayNativeModule # Adds: isAvailable()
    │
    ├──► ActionNativeModule          # handle(), hide(), getConstants()
    │
    ├──► CSENativeModule             # encryptCard(), encryptBin()
    │
    └──► SessionNativeModule         # hide(), createSession()
```

### Module Interfaces

```
ApplePayModule                       # extends ConditionalPaymentComponent
GooglePayModule                      # extends ConditionalPaymentComponent, AdyenActionComponent
InstantModule                        # extends AdyenActionComponent
DropInModule                         # extends AdyenActionComponent, AddressLookup, AdyenComponent
ActionModule                         # handle(), hide(), threeDS2SdkVersion
AdyenCSEModule                       # encryptCard(), encryptBin()
SessionHelperModule                  # extends AdyenComponent, createSession()
```

### Configuration Interfaces

```
BaseConfiguration
    │
    └──► EnvironmentConfiguration
            │
            └──► Configuration       # Full configuration with all options
                    includes:
                    - DropInConfiguration
                    - CardsConfiguration
                    - ApplePayConfiguration
                    - GooglePayConfiguration
                    - ThreeDSConfiguration
                    - PartialPaymentConfiguration

AddressLookup                        # update(), confirm(), reject()
PartialPaymentComponent              # provideBalance(), provideOrder(), providePaymentMethods()
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        AdyenCheckout                             │
│                    (React Component)                             │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────────────────────┐   │
│  │ AdyenCheckout    │    │ Event Handlers                    │   │
│  │ Context          │    │ - onSubmit, onComplete, onError   │   │
│  │ - start()        │    │ - onAdditionalDetails             │   │
│  │ - config         │    │ - Address/Partial Payment callbacks│   │
│  │ - paymentMethods │    └──────────────────────────────────┘   │
│  │ - isReady        │                    │                       │
│  └──────────────────┘                    │                       │
└────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    getWrapper()     │
                    │  (module resolver)  │
                    └─────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   DropInWrapper │  │ ApplePayWrapper │  │ GooglePayWrapper│
│                 │  │                 │  │                 │
│  NativeModule   │  │  NativeModule   │  │  NativeModule   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   Native iOS/Android│
                    │   Adyen SDK         │
                    └─────────────────────┘
```

## Event System

Events are defined in `core/constants.ts`:

| Event | Description |
|-------|-------------|
| `onSubmit` | Payment details submitted |
| `onAdditionalDetails` | Additional action details |
| `onComplete` | Payment completed |
| `onError` | Error occurred |
| `onDisableStoredPaymentMethod` | Stored payment removed |
| `onAddressUpdate` | Address lookup update |
| `onAddressConfirm` | Address confirmed |
| `onCheckBalance` | Balance check requested |
| `onRequestOrder` | Order requested |
| `onCancelOrder` | Order cancelled |
| `onBinValue` | BIN value changed |
| `onBinLookup` | BIN lookup completed |

Each wrapper declares which events it supports via the `supportedEvents` array.
