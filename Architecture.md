# Adyen React Native SDK Architecture

## Overview

The Adyen React Native SDK is a bridge between React Native applications and native Adyen payment SDKs for iOS and Android. It follows a layered architecture with clear separation between the JavaScript/TypeScript layer and native platform implementations.

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native Application                    │
├─────────────────────────────────────────────────────────────────┤
│                        src/ (TypeScript)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ components/ │  │   hooks/    │  │       modules/          │  │
│  │             │  │             │  │  (Wrapper Classes)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    React Native Bridge                          │
│              (NativeEventEmitter / NativeModules)               │
├───────────────────────────────┬─────────────────────────────────┤
│     ios/ (Swift)              │       android/ (Kotlin)         │
│  ┌───────────--------──────┐  │  ┌─────────────────────────┐    │
│  │       Components/       │  │  │      component/         │    │
│  │       (Modules)         │  │  │      (Modules)          │    │
│  └────--------─────────────┘  │  └─────────────────────────┘    │
├────--------───────────────────┼─────────────────────────────────┤
│          Adyen iOS SDK        │        Adyen Android SDK        │
└───────────────────────────────┴─────────────────────────────────┘
```

---

## Layer Details

### 1. TypeScript Layer (`src/`)

#### 1.1 Components (`src/components/`)

| Component       | Description                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------- |
| `AdyenCheckout` | Main provider component that manages payment flow, session handling, and event subscriptions |

**AdyenCheckout Responsibilities:**

- Creates and manages session context via `SessionHelper`
- Subscribes to native events using `NativeEventEmitter`
- Provides `AdyenCheckoutContext` for child components
- Routes events to appropriate callbacks (`onSubmit`, `onError`, `onComplete`, `onAdditionalDetails`)

#### 1.2 Modules (`src/modules/`)

Modules are TypeScript wrappers around native modules that provide type-safe interfaces.

```
src/modules/
├── base/                                # Base wrapper classes
│   ├── EventListenerWrapper             # Abstract base for event-capable modules
│   ├── ModuleWrapper                    # Base for non-embedded modules (open/hide)
│   ├── ActionHandlingComponentWrapper   # Adds action handling capability
│   └── getWrapper                       # Factory for getting appropriate wrapper
├── dropin/                              # Drop-in component wrapper
│   └── DropInWrapper                    # Full-featured drop-in implementation
├── session/                             # Session management
│   └── SessionWrapper                   # Handles session creation and events
├── instant/                             # Instant payment methods
├── googlepay/                           # Google Pay wrapper
├── applepay/                            # Apple Pay wrapper
├── message/                             # MessageBus for embedded components
└── cse/                                 # Client-side encryption
```

**Wrapper Class Hierarchy:**

```
EventListenerWrapper<T>
    │
    ├── ModuleWrapper<T>
    │       │
    │       └── ActionHandlingComponentWrapper<T>
    │               │
    │               └── DropInWrapper
    │               └── InstantWrapper
    │               └── GooglePayWrapper
    │               └── ApplePayWrapper
    │
    └── MessageBusWrapper (for embedded components)
```

#### 1.3 Core (`src/core/`)

| File              | Purpose                                |
| ----------------- | -------------------------------------- |
| `constants.ts`    | Event names, error codes, result codes |
| `types.ts`        | TypeScript type definitions            |
| `configurations/` | Configuration interfaces               |
| `utils.ts`        | Validation utilities                   |

---

### 2. iOS Layer (`ios/`)

#### 2.1 Components (`ios/Components/`)

```
ios/Components/
├── Base/
│   ├── BaseModule.swift          # RCTEventEmitter base with presentation logic
│   ├── BaseModuleSender.swift    # Adds delegate implementations for sending events
│   └── NativeModuleError.swift   # Error type definitions
├── DropInModule.swift            # Drop-in component implementation
├── SessionHelperModule.swift     # Session management (AdyenSessionDelegate)
├── InstantModule.swift           # Instant payment methods
├── MessageBusModule.swift        # Event bus for embedded components
├── ApplePay/                     # Apple Pay implementation
└── GooglePayModuleMock.swift     # Mock for unsupported Google Pay
```

**Module Hierarchy:**

```
RCTEventEmitter (React Native)
    │
    └── BaseModule
            │
            ├── BaseModuleSender
            │       │
            │       └── DropInModule
            │       └── InstantModule
            │       └── ApplePayModule
            │
            └── SessionHelperModule
            └── MessageBusModule
```

**Key Static Properties in BaseModule:**

- `session: AdyenSession?` - Shared session instance
- `activeModule: BaseModule?` - Currently presenting module (for dismiss delegation)
- `currentPresenter: UIViewController?` - View controller for presentation

#### 2.2 Configuration (`ios/Configuration/`)

| File                            | Purpose                                    |
| ------------------------------- | ------------------------------------------ |
| `Parameters.swift`              | Event enum definitions, configuration keys |
| `RootConfigurationParser.swift` | Parses configuration from JS               |
| `*ConfigurationParser.swift`    | Component-specific parsers                 |

---

### 3. Android Layer (`android/`)

#### 3.1 Components (`android/.../component/`)

```
component/
├── base/
│   ├── BaseModule.kt              # ReactContextBaseJavaModule base
│   ├── BaseViewModel.kt           # ViewModel for component state
│   ├── AdvancedComponentViewModel.kt   # Advanced flow ViewModel
│   ├── SessionsComponentViewModel.kt   # Sessions flow ViewModel
│   ├── BaseComponentFragment.kt   # Fragment base for UI components
│   └── ModuleException.kt         # Error definitions
├── dropin/
│   ├── DropInModule.kt            # Drop-in implementation
│   ├── AdvancedCheckoutService.kt # Service for advanced flow
│   └── SessionCheckoutService.kt  # Service for session flow
├── SessionHelperModule.kt         # Session creation
├── MessageBusModule.kt            # Event bus for embedded components
├── googlepay/                     # Google Pay implementation
├── instant/                       # Instant payment methods
└── applepay/                      # Mock for Apple Pay
```

#### 3.2 Messaging (`android/.../util/messaging/`)

```
messaging/
├── MessageBus.kt                      # Central event dispatcher
├── ComponentEventListener.kt          # Interface for component events
├── CardComponentEventListener.kt      # Card-specific events
└── DropInStoredPaymentEventListener.kt # Stored payment events
```

**MessageBus** is the central hub that:

- Implements multiple listener interfaces
- Converts native events to React Native events
- Handles both session and advanced flow events

---

## Event System

### Event Flow

```
Native Component → Native Module → React Native Bridge → TypeScript → Application Callback
```

### Event Types

Events are defined consistently across all layers:

| TypeScript (`Event` enum)      | iOS (`Events` enum)             | Android (`MessageBus`)              | Description                        |
| ------------------------------ | ------------------------------- | ----------------------------------- | ---------------------------------- |
| `onSubmit`                     | `didSubmit`                     | `DID_SUBMIT`                        | Payment data ready for submission  |
| `onAdditionalDetails`          | `didProvide`                    | `DID_PROVIDE`                       | Additional action data (3DS, etc.) |
| `onComplete`                   | `didComplete`                   | `DID_COMPLETE`                      | Payment flow completed (advanced)  |
| `onSessionComplete`            | `didCompleteSession`            | `DID_COMPLETE_SESSION`              | Session payment completed          |
| `onError`                      | `didFail`                       | `DID_FAILED`                        | Error occurred (advanced)          |
| `onSessionError`               | `didFailSession`                | `DID_FAILED_SESSION`                | Session error occurred             |
| `onDisableStoredPaymentMethod` | `didDisableStoredPaymentMethod` | `DID_DISABLE_STORED_PAYMENT_METHOD` | Remove stored payment              |
| `onAddressUpdate`              | `didUpdateAddress`              | `DID_UPDATE_ADDRESS`                | Address lookup query               |
| `onAddressConfirm`             | `didConfirmAddress`             | `DID_CONFIRM_ADDRESS`               | Address selected                   |
| `onCheckBalance`               | `didCheckBalance`               | `DID_CHECK_BALANCE`                 | Balance check request              |
| `onRequestOrder`               | `didRequestOrder`               | `DID_REQUEST_ORDER`                 | Order creation request             |
| `onCancelOrder`                | `didCancelOrder`                | `DID_CANCEL_ORDER`                  | Order cancellation                 |
| `onBinLookup`                  | `didBinLookup`                  | `DID_BIN_LOOKUP`                    | Card BIN lookup result             |
| `onBinValue`                   | `didChangeBinValue`             | `DID_CHANGE_BIN_VALUE`              | Card BIN value changed             |

### Session vs Advanced Flow Events

The SDK differentiates between session-based and advanced payment flows:

**Session Flow:**

- Uses `SessionHelper` for session creation
- Events: `onSessionComplete`, `onSessionError`
- Native delegates: `AdyenSessionDelegate` (iOS), `SessionComponentCallback` (Android)

**Advanced Flow:**

- Uses direct component modules
- Events: `onComplete`, `onError`, `onSubmit`, `onAdditionalDetails`
- Requires merchant backend integration

---

## Integration Flows

### 1. Session Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Application │────▶│ AdyenCheckout│────▶│ SessionHelper   │────▶│ Native Module│
│             │     │              │     │ (SessionWrapper)│     │              │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                           │                      │                      │
                           │  createSession()     │                      │
                           │─────────────────────▶│                      │
                           │                      │   createSession()    │
                           │                      │─────────────────────▶│
                           │                      │                      │
                           │                      │◀── SessionContext ───│
                           │◀─── paymentMethods ──│                      │
                           │                      │                      │
                           │     start('dropin')  │                      │
                           │─────────────────────────────────────────────▶
                           │                      │                      │
                           │◀─── onSessionComplete/onSessionError ───────│
```

### 2. Advanced Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│ Application │────▶│ AdyenCheckout│────▶│ ComponentWrapper│────▶│ Native Module│
│             │     │              │     │ (DropIn, etc.)  │     │              │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
                           │                      │                      │
                           │     start('dropin')  │                      │
                           │─────────────────────▶│                      │
                           │                      │      open()          │
                           │                      │─────────────────────▶│
                           │                      │                      │
                           │◀───────── onSubmit ─────────────────────────│
                           │                      │                      │
                           │  (merchant backend)  │                      │
                           │─────────────────────▶│                      │
                           │                      │     handle(action)   │
                           │                      │─────────────────────▶│
                           │                      │                      │
                           │◀── onAdditionalDetails ─────────────────────│
                           │                      │                      │
                           │◀── onComplete/onError ──────────────────────│
```

---

## Module Responsibilities

### iOS BaseModule

| Responsibility   | Implementation                                                            |
| ---------------- | ------------------------------------------------------------------------- |
| Event emission   | `sendEvent(event:body:)`, `sendEvent(error:)`, `sendSessionEvent(error:)` |
| UI Presentation  | `present(_:)` via `PresentationDelegate`                                  |
| Dismiss handling | `dismiss(_:)` with `activeModule` delegation                              |
| Cleanup          | `cleanUp()` clears session, presenter, component references               |
| Action handling  | `actionHandler: AdyenActionComponent`                                     |

### Android MessageBus

| Responsibility      | Implementation                                               |
| ------------------- | ------------------------------------------------------------ |
| Event dispatch      | `sendEvent()`, `sendErrorEvent()`, `sendSessionErrorEvent()` |
| Component callbacks | Implements `ComponentEventListener`, `AddressLookupCallback` |
| State serialization | Uses Adyen SDK serializers + `ReactNativeJson`               |
| Session completion  | `onFinished()` → `DID_COMPLETE_SESSION`                      |

---

## Dependencies

### External Dependencies

| Platform   | Dependency                                           | Purpose              |
| ---------- | ---------------------------------------------------- | -------------------- |
| iOS        | Adyen SDK (`Adyen`, `Adyen3DS2`)                     | Payment components   |
| iOS        | React (`RCTEventEmitter`)                            | Native bridge        |
| Android    | Adyen SDK (`com.adyen.checkout.*`)                   | Payment components   |
| Android    | React Native (`ReactContextBaseJavaModule`)          | Native bridge        |
| TypeScript | React Native (`NativeEventEmitter`, `NativeModules`) | Bridge communication |

### Internal Dependencies

```
TypeScript:
  AdyenCheckout
    └── SessionHelper (SessionWrapper)
    └── MessageBus (MessageBusWrapper)
    └── getWrapper() → DropInWrapper, InstantWrapper, etc.

iOS:
  DropInModule
    └── BaseModuleSender
        └── BaseModule
            └── static session, activeModule, currentPresenter
  SessionHelperModule
    └── BaseModule

Android:
  DropInModule
    └── BaseModule
    └── MessageBus (injected)
  SessionHelperModule
    └── BaseModule
  *ViewModel
    └── MessageBus (via AdyenPaymentPackage.messageBus)
```

---

## Key Design Patterns

1. **Wrapper Pattern**: TypeScript wrappers abstract native module interfaces
2. **Observer Pattern**: Event-based communication via NativeEventEmitter
3. **Delegation**: iOS uses delegate pattern for session/component callbacks
4. **Singleton**: Static session and activeModule references for cross-module state
5. **Factory**: `getWrapper()` creates appropriate wrapper based on payment type
6. **Context Provider**: React Context for sharing checkout state with children

---

## File Structure Summary

```
adyen-react-native/
├── src/                          # TypeScript source
│   ├── components/               # React components
│   ├── core/                     # Types, constants, utils
│   ├── hooks/                    # React hooks
│   └── modules/                  # Native module wrappers
├── ios/                          # iOS native code
│   ├── Components/               # Native modules
│   ├── Configuration/            # Config parsers
│   ├── Helpers/                  # Utilities
│   └── Model/                    # Data models
└── android/src/main/java/.../    # Android native code
    ├── component/                # Native modules
    ├── configuration/            # Config factories
    ├── react/                    # React integration
    └── util/                     # Utilities & MessageBus
```
