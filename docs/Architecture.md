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
│   ├── utils.ts                # Configuration validation utilities
│   └── common/
│       └── Styles.ts           # Shared styles
├── core/                       # Core types, constants, and configurations
│   ├── index.ts
│   ├── types.ts                # Payment types and component interfaces
│   ├── constants.ts            # Event enums, error codes, result codes
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
├── plugin/                     # Expo config plugins
│   ├── withAdyen.ts            # Main plugin entry
│   ├── withAdyenIos.ts         # iOS-specific configuration
│   ├── withAdyenAndroid.ts     # Android-specific configuration
│   └── ...                     # Platform setup utilities
├── specs/                      # TurboModule specs
│   └── NativePlatformPayView.ts
└── modules/                    # Native module wrappers
    ├── index.ts
    ├── base/                   # Base wrapper classes
    │   ├── EventListenerWrapper.ts     # Abstract base for event handling
    │   ├── ModuleWrapper.ts            # Abstract base with hide()
    │   ├── PaymentComponentWrapper.ts  # Abstract base with open()
    │   ├── ActionHandlingComponentWrapper.ts  # Abstract base with handle()
    │   ├── ModuleMock.ts               # Mock for unavailable modules
    │   ├── constants.ts                # Module-specific constants
    │   ├── getWrapper.ts               # Factory to resolve payment method wrappers
    │   └── utils.ts                    # Utility functions
    ├── action/                 # Standalone action handler
    │   ├── AdyenAction.ts
    │   └── ActionModuleWrapper.ts
    ├── applepay/               # Apple Pay module
    │   ├── AdyenApplePay.ts
    │   └── ApplePayWrapper.ts
    ├── cse/                    # Client-side encryption
    │   ├── AdyenCSEModule.ts
    │   ├── AdyenCSEModuleWrapper.ts
    │   └── types.ts                  # Card type definition
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
        ├── SessionWrapper.ts
        └── types.ts
```

## Class Hierarchy

### Wrapper Classes

Supported events are read from the native module's `getConstants().supportedEvents` at construction time.

```
NativeModule (react-native)
    │
    ▼
EventListenerWrapper<T>                                      # Abstract - manages event subscriptions
    │                                                          - reads supportedEvents from getConstants()
    │                                                          - isSupported(event)
    │                                                          - eventEmitterTarget (for NativeEventEmitter)
    │                                                          - addListener/removeListeners
    ▼
ModuleWrapper<T>                                             # Abstract - adds hide()
    │   implements AdyenComponent
    │
    ▼
PaymentComponentWrapper<T>                                   # Abstract - adds open()
    │
    ├──► ApplePayWrapper                                     # implements ApplePayModule, AdyenActionComponent
    │       + isAvailable()
    │       + handle() → throws (Apple Pay doesn't support actions)
    │
    ▼
ActionHandlingComponentWrapper<T>                            # Abstract - adds handle()
    │   implements AdyenActionComponent
    │
    ├──► GooglePayWrapper                                    # implements GooglePayModule
    │       + isAvailable()
    │
    ├──► InstantWrapper                                      # implements InstantModule
    │
    └──► DropInWrapper                                       # implements DropInModule
            + getReturnURL()
            + removeStored()                       (RemovesStoredPayment)
            + update(), confirm(), reject()        (AddressLookup)
            + provideBalance/Order/PaymentMethods  (PartialPayment)
```

### Standalone Wrappers (outside hierarchy)

These don't inherit from `EventListenerWrapper` as they don't need event subscription management:

```
ActionModuleWrapper                                          # implements ActionModule
    - handle(action, config) → Promise<PaymentDetailsData>
    - hide(success)
    - threeDS2SdkVersion

SessionWrapper                                               # implements SessionHelperModule
    - createSession(session, config) → Promise<SessionContext>
    - hide(success, option?)
    - onComplete(callback) → EmitterSubscription
    - onError(callback) → EmitterSubscription
    - removeAllListeners()

AdyenCSEModuleWrapper                                        # implements AdyenCSEModule
    - encryptCard(card, publicKey)
    - encryptBin(bin, publicKey)
```

## Interface Dependencies

### Core Component Interfaces (`core/types.ts`)

```
AdyenComponent                    # Base interface
    │   hide(success, option?)
    │
    └──► AdyenActionComponent     # Extends AdyenComponent
            handle(action)

ConditionalPaymentComponent       # Standalone interface
    isAvailable(paymentMethod, configuration) → Promise<boolean>
```

### Native Module Interface Hierarchy

Native module interfaces extend their public module interfaces for type alignment:

```
NativeModule (react-native)
    │
    ├──► BaseNativeModule                                                  # modules/base/ModuleWrapper.ts
    │       - hide(success, option?)
    │       │
    │       └──► PaymentModule                                             # modules/base/PaymentComponentWrapper.ts
    │               - hide(success, option?)                                 [inherited]
    │               - open(paymentMethods, configuration)
    │               │
    │               ├──► ActionHandlingNativeModule                        # modules/base/ActionHandlingComponentWrapper.ts
    │               │       - hide(success, option?)                         [inherited]
    │               │       - open(paymentMethods, config)                   [inherited]
    │               │       - handle(action)
    │               │       │
    │               │       ├──► GooglePayNativeModule                     # modules/googlepay/GooglePayWrapper.ts
    │               │       │       - hide(success, option?)                 [inherited]
    │               │       │       - open(paymentMethods, config)           [inherited]
    │               │       │       - handle(action)                         [inherited]
    │               │       │       - isAvailable(paymentMethod, config) → Promise<boolean>
    │               │       │
    │               │       └──► DropInNativeModule                        # modules/dropin/DropInWrapper.ts
    │               │               - hide(success, option?)                 [inherited]
    │               │               - open(paymentMethods, config)           [inherited]
    │               │               - handle(action)                         [inherited]
    │               │               - getReturnURL() → Promise<string>
    │               │               - providePaymentMethods(paymentMethods, order)
    │               │               - provideBalance(success, balance?, error?)
    │               │               - provideOrder(success, order?, error?)
    │               │               - removeStored(success)
    │               │               - update(results)
    │               │               - confirm(success, addressOrError?)
    │               │
    │               └──► ApplePayNativeModule                              # modules/applepay/ApplePayWrapper.ts
    │                       - hide(success, option?)                         [inherited]
    │                       - open(paymentMethods, config)                   [inherited]
    │                       - isAvailable(paymentMethod, config) → Promise<boolean>
    │
    ├──► ActionNativeModule                                                # modules/action/ActionModuleWrapper.ts
    │       - handle(action, config) → Promise<PaymentDetailsData>
    │       - hide(success)
    │       - getConstants() → { threeDS2SdkVersion }
    │
    ├──► SessionNativeModule                                               # modules/session/SessionWrapper.ts
    │       - hide(success, option?)
    │       - createSession(session, config) → Promise<SessionContext>
    │
    └──► CSENativeModule                                                   # modules/cse/AdyenCSEModuleWrapper.ts
            - encryptCard(payload, publicKey) → Promise<Card>
            - encryptBin(payload, publicKey) → Promise<string>
```

### Public Module Interfaces

```
ApplePayModule                                               # extends AdyenComponent, ConditionalPaymentComponent
    - hide(success, option?)                                   [from AdyenComponent]
    - isAvailable(paymentMethod, config) → Promise<boolean>    [from ConditionalPaymentComponent]

GooglePayModule                                              # extends ConditionalPaymentComponent, AdyenActionComponent
    - hide(success, option?)                                   [from AdyenComponent]
    - handle(action)                                           [from AdyenActionComponent]
    - isAvailable(paymentMethod, config) → Promise<boolean>    [from ConditionalPaymentComponent]

InstantModule                                                # extends AdyenActionComponent
    - hide(success, option?)                                   [from AdyenComponent]
    - handle(action)                                           [from AdyenActionComponent]

DropInModule                                                 # extends AdyenActionComponent
    - hide(success, option?)                                   [from AdyenComponent]
    - handle(action)                                           [from AdyenActionComponent]
    - getReturnURL() → Promise<string>
    - providePaymentMethods(paymentMethods, order)

ActionModule                                                 # standalone
    - threeDS2SdkVersion: string
    - handle(action, config) → Promise<PaymentDetailsData>
    - hide(success)

AdyenCSEModule                                               # standalone
    - encryptCard(payload, publicKey) → Promise<Card>
    - encryptBin(payload, publicKey) → Promise<string>

SessionHelperModule                                          # extends AdyenComponent
    - hide(success, option?)                                   [from AdyenComponent]
    - createSession(session, config) → Promise<SessionContext>
```

### Configuration Hierarchy

```
BaseConfiguration
    │   environment, clientKey, countryCode, locale?
    │
    └──► EnvironmentConfiguration
            │   + amount
            │
            └──► Configuration
                    + analytics?
                    + dropin?
                    + card?
                    + applepay?
                    + googlepay?
                    + threeDS2?
                    + partialPayment?
```

## Native Class Hierarchies

### iOS Class Structure

```
RCTEventEmitter (React Native)
    │
    ▼
BaseModule                                           # Base class for all iOS modules
    │   - session: AdyenSession? (static)
    │   - currentModule: BaseModule? (static)
    │   - currentPresenter: UIViewController? (static)
    │   - currentComponent: Component?
    │   - actionHandler: AdyenActionComponent?
    │   - supportedEvents() → [String]
    │   - constantsToExport() → ["supportedEvents": ...]
    │   - hide(success, event)
    │   - present(component)
    │   - cleanUp()
    │   - sendError(error)
    │
    ├──► SessionHelperModule                         # Session management
    │       - createSession(sessionModel, config)
    │       - SessionErrorDelegate
    │       - AdyenSessionDelegate
    │
    ├──► ActionModule                                # Standalone action handler (Promise-based)
    │       - handle(action, config) → Promise
    │       - hide(success)
    │       - ActionComponentDelegate
    │
    └──► BaseModuleSender                            # Adds event sending helpers
            │   - createActionHandler(context, locale)
            │   - sendSubmitEvent(data)
            │   - sendCompleteEvent()
            │   - sendProvideEvent(actionData)
            │
            ├──► ApplePayModule                      # Apple Pay component
            │       - open(paymentMethods, config)
            │       - isAvailable(paymentMethod, config)
            │
            └──► BaseActionHandler                   # Adds handle() for actions
                    │   - handle(action)
                    │
                    ├──► InstantModule               # Instant/redirect payments
                    │       - open(paymentMethods, config)
                    │
                    └──► BaseAddressLookup           # Adds address lookup support
                            │   - update(results)
                            │   - confirm(success, address)
                            │   - AddressLookupProvider protocol
                            │
                            └──► DropInModule        # Drop-in component
                                    - open(paymentMethods, config)
                                    - handle(action)
                                    - removeStored(success)
                                    - getReturnURL()
                                    - provideBalance/Order/PaymentMethods
                                    - CardComponentDelegate
                                    - StoredPaymentMethodsDelegate
                                    - PartialPaymentDelegate
```

### Android Class Structure

```
ReactContextBaseJavaModule (React Native)
    │
    ▼
AppCompatModule                                      # Provides AppCompatActivity access
    │   - appCompatActivity: AppCompatActivity
    │
    ├──► ActionModule                                # Standalone action handler (Promise-based)
    │       - handle(action, config) → Promise
    │       - hide(success)
    │       - ActionComponentCallback
    │
    ▼
BaseModule                                           # Base class for payment modules
    │   - session: CheckoutSession? (companion)
    │   - currentModule: BaseModule? (companion)
    │   - messageBus: MessageBus
    │   - supportedEvents(): List<String> (abstract)
    │   - hide(success, message) (abstract)
    │   - getConstants() → ["supportedEvents": ...]
    │   - cleanup()
    │   - sendError(exception)
    │
    ├──► SessionHelperModule                         # Session management
    │       - createSession(sessionModel, config)
    │       - hide() delegates to currentModule
    │
    ├──► GooglePayModule                             # Google Pay component
    │       - open(paymentMethods, config)
    │       - handle(action)
    │       - isAvailable(paymentMethods, config)
    │
    ├──► InstantModule                               # Instant/redirect payments
    │       - open(paymentMethods, config)
    │       - handle(action)
    │
    └──► DropInModule                                # Drop-in component
            - open(paymentMethods, config)
            - handle(action)
            - removeStored(success)
            - getReturnURL()
            - update/confirm (address lookup)
            - provideBalance/Order/PaymentMethods
```

### Android Messaging Architecture

```
Emitter (interface)                                  # Event emission contract
    │   - sendError(eventName, error)
    │   - send(eventName, payload)
    │   - sendEvent(eventName, json/string)
    │
    └──► MessageBusEmitter                           # Implementation using ReactContext
            - context: ReactContext
            - emits via RCTDeviceEventEmitter

MessageBus                                           # Aggregates all messengers via delegation
    │   implements:
    │   - SessionMessenger (onSessionException, onFinished)
    │   - AdvancedMessenger (onSubmit, onAdditionalDetails, onException, onFinished)
    │   - PartialPaymentMessenger (onBalanceCheck, onOrderRequest, onOrderCancel)
    │   - RemoveStoredPaymentMessenger (onRemove)
    │   - CardMessenger (onBinValue, onBinLookup)
    │   - AddressLookupCallback (onQueryChanged, onLookupCompletion)
```

## Common Native Module Patterns

### Lifecycle Pattern

Both platforms follow a consistent lifecycle for payment components:

1. **Session Setup** (optional) - `SessionHelperModule.createSession()` stores session in static/companion property
2. **Open** - Module sets `currentModule = self/this`, initializes component, presents UI
3. **Events** - Native SDK callbacks are translated to JS events via emitter
4. **Hide** - Cleanup resources, dismiss UI, clear static references

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Session   │────►│    Open     │────►│   Events    │────►│    Hide     │
│   (opt.)    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
 Store session      Set currentModule    Emit to JS         Clear refs
 in static prop     Present UI           via emitter        Dismiss UI
```

### Static State Management

Both platforms use static/companion properties for cross-module coordination:

| Property           | iOS               | Android            | Purpose                       |
| ------------------ | ----------------- | ------------------ | ----------------------------- |
| `session`          | `static var`      | `companion object` | Shared checkout session       |
| `currentModule`    | `static weak var` | `companion object` | Active module for delegation  |
| `currentPresenter` | `static var`      | N/A                | iOS presenter view controller |

### Error Routing Pattern

Errors are routed differently based on integration type:

```
                    ┌─────────────────┐
                    │  Error occurs   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ session != nil? │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ YES                         │ NO
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ Session Error   │           │ Advanced Error  │
    │ (failSession)   │           │ (fail)          │
    └─────────────────┘           └─────────────────┘
```

### Hide Delegation Pattern

`SessionHelperModule.hide()` delegates to the active component module:

**Android:**

```kotlin
override fun hide(success: Boolean, message: ReadableMap?) {
  currentModule?.hide(success, message)
  cleanup()
}
```

**iOS:**

```swift
override func hide(_ success: NSNumber, event: NSDictionary) {
  super.hide(success, event: event)
  if let activeModule = BaseModule.currentModule {
    activeModule.hide(success, event: event)
  }
}
```

### Event Emission Differences

| Aspect            | iOS                             | Android                           |
| ----------------- | ------------------------------- | --------------------------------- |
| Base class        | `RCTEventEmitter`               | `ReactContextBaseJavaModule`      |
| Emit method       | `sendEvent(withName:body:)`     | `RCTDeviceEventEmitter.emit()`    |
| Event declaration | `supportedEvents() -> [String]` | `supportedEvents(): List<String>` |
| Constants export  | `constantsToExport()`           | `getConstants()`                  |

### Delegate/Callback Pattern

Both platforms translate native SDK delegates to JS events:

**iOS** - Protocol conformance:

```swift
extension DropInModule: PaymentComponentDelegate {
  func didSubmit(_ data: PaymentComponentData, ...) {
    sendSubmitEvent(data: data)
  }
}
```

**Android** - MessageBus delegation:

```kotlin
// SDK callback → MessageBus → Emitter → JS
messageBus.onSubmit(state, returnUrl)  // internally calls emitter.sendEvent()
```

## Event System

Supported events are exposed by native modules via `getConstants()` and read by the JS wrapper at construction:

```typescript
// EventListenerWrapper constructor reads from native module
constructor(nativeModule: T) {
  this.nativeModule = nativeModule;
  const constants = nativeModule.getConstants?.();
  this.supportedEvents = constants?.supportedEvents ?? [];
}

// AdyenCheckout conditionally subscribes based on native support
if (nativeComponent.isSupported(Event.onSubmit)) {
  subscriptions.push(
    eventEmitter.addListener(Event.onSubmit, handler)
  );
}
```

### Native Module Event Declaration

**iOS** - Override `constantsToExport()` in `BaseModule.swift`:

```swift
@objc override func constantsToExport() -> [AnyHashable: Any]! {
  ["supportedEvents": supportedEvents() ?? []]
}
```

**Android** - Override `getConstants()` in `BaseModule.kt`:

```kotlin
override fun getConstants(): MutableMap<String, Any> =
  mutableMapOf("supportedEvents" to supportedEvents())
```

### Event Reference

| Event                          | Native Callback                         | Description                      |
| ------------------------------ | --------------------------------------- | -------------------------------- |
| `onSubmit`                     | `didSubmitCallback`                     | Payment details submitted        |
| `onAdditionalDetails`          | `didProvideCallback`                    | Additional action details needed |
| `onComplete`                   | `didCompleteCallback`                   | Payment completed (vouchers)     |
| `onError`                      | `didFailCallback`                       | Error occurred                   |
| `onDisableStoredPaymentMethod` | `didDisableStoredPaymentMethodCallback` | Stored payment removal requested |
| `onAddressUpdate`              | `didUpdateAddressCallback`              | Address lookup update            |
| `onAddressConfirm`             | `didConfirmAddressCallback`             | Address confirmed                |
| `onCheckBalance`               | `didCheckBalanceCallback`               | Balance check requested          |
| `onRequestOrder`               | `didRequestOrderCallback`               | New order requested              |
| `onCancelOrder`                | `didCancelOrderCallback`                | Order cancelled                  |
| `onBinValue`                   | `didChangeBinValueCallback`             | BIN value changed                |
| `onBinLookup`                  | `didBinLookupCallback`                  | BIN lookup completed             |

## Data Flow

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                               AdyenCheckout                                                    │
│                                            (React Component)                                                   │
│                                                                                                                │
│    ┌──────────────────────────────────┐             ┌────────────────────────────────────────────────────────┐ │
│    │ AdyenCheckout                    │             │ Event Handlers (props)                                 │ │
│    │ Context                          │             │ - onSubmit(data, component, extra)                     │ │
│    │ - start(name)                    │             │ - onComplete(result, component)                        │ │
│    │ - config                         │             │ - onError(error, component)                            │ │
│    │ - paymentMethods                 │             │ - onAdditionalDetails(data, component)                 │ │
│    │ - session?                       │             │                                                        │ │
│    └──────────────────────────────────┘             └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
                                          ┌───────────────────────────┐
                                          │       getWrapper()        │
                                          │     (module resolver)     │
                                          │     maps type name →      │
                                          │     wrapper instance      │
                                          └───────────────────────────┘
                                                        │
                                                        ▼
          ┌─────────────────────────────┬───────────────────────────────┬─────────────────────────────┐
          ▼                             ▼                               ▼                             ▼
┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
│     DropInWrapper     │   │    ApplePayWrapper    │   │   GooglePayWrapper    │   │    InstantWrapper     │
│                       │   │                       │   │                       │   │                       │
│   - open()            │   │   - open()            │   │   - open()            │   │   - open()            │
│   - handle()          │   │   - handle() ✗        │   │   - handle()          │   │   - handle()          │
│   - hide()            │   │   - isAvailable()     │   │   - isAvailable()     │   │   - hide()            │
│   - ...               │   │   - hide()            │   │   - hide()            │   │                       │
└───────────────────────┘   └───────────────────────┘   └───────────────────────┘   └───────────────────────┘
          │                             │                               │                             │
          └─────────────────────────────┴───────────────────────────────┴─────────────────────────────┘
                                                        │
                                                        ▼
                                          ┌───────────────────────────┐
                                          │    Native iOS/Android     │
                                          │        Adyen SDK          │
                                          └───────────────────────────┘
```
