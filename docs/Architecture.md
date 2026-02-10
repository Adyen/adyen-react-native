# Architecture

## Data Flow

```mermaid
flowchart TB

    subgraph Checkout["AdyenCheckout<br/>(React Component)"]
        Context["<b>useAdyenCheckout</b><br/>- start(name)<br/>- config<br/>- paymentMethods<br/>- isReady"]
        Handlers["<b>Event Handlers (props)</b><br/><br/>- onSubmit(data, component, extra)<br/>- onComplete(result, component)<br/>- onError(error, component)<br/>- onAdditionalDetails(data, component)"]
    end

    Resolver["<b>getWrapper()</b><br/>(module resolver)<br/>maps type name → wrapper instance"]
    EventEmitter["<b>NativeEventEmitter</b><br/><br/>subscribes to events supported by<br/>a selected module"]

    DropInWrapper["<b>DropInWrapper</b><br/><br/>- open()<br/>- handle()<br/>- hide()<br/>- ..."]
    ApplePayWrapper["<b>ApplePayWrapper</b><br/><br/>- open()<br/>- isAvailable()<br/>- hide()"]
    GooglePayWrapper["<b>GooglePayWrapper</b><br/><br/>- open()<br/>- handle()<br/>- isAvailable()<br/>- hide()"]
    InstantWrapper["<b>InstantWrapper</b><br/><br/>- open()<br/>- handle()<br/>- hide()"]
 
    subgraph Native["Native iOS/Android"]
        direction BT
        DropInModule["<b>DropInModule</b><br/><br/>- supportedEvents<br/>- open()<br/>- handle()<br/>- hide()<br/>- ..."]
        ApplePayModule["<b>ApplePayModule</b><br/><br/>- supportedEvents<br/>- open()<br/>- isAvailable()<br/>- hide()"]
        GooglePayModule["<b>GooglePayModule</b><br/><br/>- supportedEvents<br/>- open()<br/>- handle()<br/>- isAvailable()<br/>- hide()"]
        InstantModule["<b>InstantModule</b><br/><br/>- supportedEvents<br/>- open()<br/>- handle()<br/>- hide()"]
 
        MessageBus["<b>EventEmitter/MessageBus</b>"]
    end
 
    Context -->|"start('name')"| Resolver
    Resolver -.->|subscribes| EventEmitter
    Resolver --> DropInWrapper
    Resolver --> ApplePayWrapper
    Resolver --> GooglePayWrapper
    Resolver --> InstantWrapper
 
    DropInWrapper --> DropInModule
    ApplePayWrapper --> ApplePayModule
    GooglePayWrapper --> GooglePayModule
    InstantWrapper --> InstantModule
 
    DropInModule --> MessageBus
    ApplePayModule --> MessageBus
    GooglePayModule --> MessageBus
    InstantModule --> MessageBus
 
    MessageBus -->|"Events flow back up<br/>through bridge"| EventEmitter
    EventEmitter --> Handlers
 
    style Checkout fill:#dae8fc,stroke:#,color:#000
    style Context fill:#fff2cc,stroke:#d6b656,color:#000
    style Handlers fill:#fff2cc,stroke:#d6b656,color:#000
    style Resolver fill:#e1d5e7,stroke:#9673a6,color:#000
    style EventEmitter fill:#e1d5e7,stroke:#9673a6,color:#000
    style DropInWrapper fill:#d5e8d4,stroke:#82b366,color:#000
    style ApplePayWrapper fill:#d5e8d4,stroke:#82b366,color:#000
    style GooglePayWrapper fill:#d5e8d4,stroke:#82b366,color:#000
    style InstantWrapper fill:#d5e8d4,stroke:#82b366,color:#000
    style DropInModule fill:#ffe6cc,stroke:#d79b00,color:#000
    style ApplePayModule fill:#ffe6cc,stroke:#d79b00,color:#000
    style GooglePayModule fill:#ffe6cc,stroke:#d79b00,color:#000
    style InstantModule fill:#ffe6cc,stroke:#d79b00,color:#000
    style MessageBus fill:#d0cee2,stroke:#56517e,color:#000
    style Native fill:none,stroke:#6c8ebf,stroke-dasharray:8 8,color:#aaa
```

## Directory Structure

```
src/
├── index.ts                           # Main entry point (barrel exports)
├── components/                        # React components
│   ├── index.ts
│   ├── AdyenCheckout.tsx              # Main checkout component with context provider
│   ├── ApplePayButton.tsx             # Apple Pay button component
│   ├── GooglePayButton.tsx            # Google Pay button component
│   ├── utils.ts                       # Configuration validation utilities
│   └── common/
│       └── Styles.ts                  # Shared styles
├── core/                              # Core types, constants, and configurations
│   ├── index.ts
│   ├── types.ts                       # Payment types and component interfaces
│   ├── constants.ts                   # Event enums, error codes, result codes
│   ├── components.ts                  # Payment method component mappings
│   └── configurations/                # Configuration interfaces
│       ├── index.ts
│       ├── Configuration.ts
│       ├── AddressLookup.ts
│       ├── ApplePayConfiguration.ts
│       ├── CardsConfiguration.ts
│       ├── DropInConfiguration.ts
│       ├── GooglePayConfiguration.ts
│       ├── PartialPaymentConfiguration.ts
│       └── ThreeDSConfiguration.ts
├── hooks/                             # React hooks
│   ├── index.ts
│   └── useAdyenCheckout.ts            # Context hook for checkout state
├── plugin/                            # Expo config plugins
│   ├── withAdyen.ts                           # Main plugin entry
│   ├── withAdyenIos.ts                        # iOS-specific configuration
│   ├── withAdyenAndroid.ts                    # Android-specific configuration
│   └── ...                                    # Platform setup utilities
├── specs/                             # TurboModule specs
│   └── NativePlatformPayView.ts
└── modules/                           # Native module wrappers
    ├── index.ts
    ├── base/                          # Base wrapper classes
    │   ├── EventListenerWrapper.ts            # Abstract base for event handling
    │   ├── ModuleWrapper.ts                   # Abstract base with hide()
    │   ├── PaymentComponentWrapper.ts         # Abstract base with open()
    │   ├── ActionHandlingComponentWrapper.ts  # Abstract base with handle()
    │   ├── ModuleMock.ts                      # Mock for unavailable modules
    │   ├── constants.ts                       # Module-specific constants
    │   ├── getWrapper.ts                      # Factory to resolve payment method wrappers
    │   └── utils.ts                           # Utility functions
    ├── action/                        # Standalone action handler
    │   ├── AdyenAction.ts
    │   └── ActionModuleWrapper.ts
    ├── applepay/                      # Apple Pay module
    │   ├── AdyenApplePay.ts
    │   └── ApplePayWrapper.ts
    ├── cse/                           # Client-side encryption
    │   ├── types.ts
    │   ├── AdyenCSEModule.ts
    │   └── AdyenCSEModuleWrapper.ts
    ├── dropin/                        # Drop-in module
    │   ├── AdyenDropIn.ts
    │   └── DropInWrapper.ts
    ├── googlepay/                     # Google Pay module
    │   ├── AdyenGooglePay.ts
    │   └── GooglePayWrapper.ts
    ├── instant/                       # Instant/redirect payments
    │   ├── AdyenInstant.ts
    │   └── InstantWrapper.ts
    └── session/                       # Session management
        ├── SessionHelperModule.ts
        ├── SessionWrapper.ts
        └── types.ts
```

## Class Hierarchy

### Wrapper Classes

Supported events are read from the native module's `getConstants().supportedEvents` at construction time.

```mermaid
flowchart TB
    NativeModule["NativeModule (react-native)"]
    
    EventListener["EventListenerWrapper&lt;T&gt;<br/><br/>Abstract - manages event subscriptions<br/>- reads supportedEvents from getConstants()<br/>- isSupported(event)<br/>- eventEmitterTarget (for NativeEventEmitter)<br/>- addListener/removeListeners"]
    
    ModuleWrapper["ModuleWrapper&lt;T&gt;<br/><br/>Abstract - adds hide()<br/>implements AdyenComponent"]
    
    PaymentComponent["PaymentComponentWrapper&lt;T&gt;<br/><br/>Abstract - adds open()"]
    
    ApplePay["ApplePayWrapper<br/><br/>implements ApplePayModule, AdyenActionComponent<br/>+ isAvailable()"]
    
    ActionHandling["ActionHandlingComponentWrapper&lt;T&gt;<br/><br/>Abstract - adds handle()<br/>implements AdyenActionComponent"]
    
    GooglePay["GooglePayWrapper<br/><br/>implements GooglePayModule<br/>+ isAvailable()"]
    
    Instant["InstantWrapper<br/><br/>implements InstantModule"]
    
    DropIn["DropInWrapper<br/><br/>implements DropInModule<br/>+ getReturnURL()<br/>+ removeStored() (RemovesStoredPayment)<br/>+ update(), confirm(), reject() (AddressLookup)<br/>+ provideBalance/Order/PaymentMethods (PartialPayment)"]
    
    NativeModule --> EventListener
    EventListener --> ModuleWrapper
    ModuleWrapper --> PaymentComponent
    PaymentComponent --> ApplePay
    PaymentComponent --> ActionHandling
    ActionHandling --> GooglePay
    ActionHandling --> Instant
    ActionHandling --> DropIn
    
    style NativeModule fill:#e1e1e1,stroke:#666,color:#000
    style EventListener fill:#fff2cc,stroke:#d6b656,color:#000
    style ModuleWrapper fill:#fff2cc,stroke:#d6b656,color:#000
    style PaymentComponent fill:#fff2cc,stroke:#d6b656,color:#000
    style ActionHandling fill:#fff2cc,stroke:#d6b656,color:#000
    style ApplePay fill:#d5e8d4,stroke:#82b366,color:#000
    style GooglePay fill:#d5e8d4,stroke:#82b366,color:#000
    style Instant fill:#d5e8d4,stroke:#82b366,color:#000
    style DropIn fill:#d5e8d4,stroke:#82b366,color:#000
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

### Core Interfaces (`core/types.ts`)

```mermaid
flowchart TB
    AdyenComp["AdyenComponent<br/><br/>Base interface<br/>hide(success, option?)"]
    
    AdyenAction["AdyenActionComponent<br/><br/>Extends AdyenComponent<br/>+ handle(action)"]
    
    Conditional["ConditionalPaymentComponent<br/><br/>Standalone interface<br/>isAvailable(paymentMethod, configuration) → Promise&lt;boolean&gt;"]
    
    AdyenComp --> AdyenAction
    
    style AdyenComp fill:#e1d5e7,stroke:#9673a6,color:#000
    style AdyenAction fill:#e1d5e7,stroke:#9673a6,color:#000
    style Conditional fill:#ffe6cc,stroke:#d79b00,color:#000
```

**Public module interfaces** mirror this structure, extending core interfaces:

- `ApplePayModule` — extends `AdyenActionComponent`, `ConditionalPaymentComponent`
- `GooglePayModule` — extends `AdyenActionComponent`, `ConditionalPaymentComponent`
- `InstantModule` — extends `AdyenActionComponent`
- `DropInModule` — extends `AdyenActionComponent` + partial payment & address lookup methods
- `ActionModule`, `AdyenCSEModule`, `SessionHelperModule` — standalone

### Configuration Hierarchy

```mermaid
flowchart TB
    Base["BaseConfiguration<br/><br/>environment, clientKey, countryCode, locale?"]
    
    Env["EnvironmentConfiguration<br/><br/>+ amount"]
    
    Config["Configuration<br/><br/>+ analytics?<br/>+ dropin?<br/>+ card?<br/>+ applepay?<br/>+ googlepay?<br/>+ threeDS2?<br/>+ partialPayment?"]
    
    Base --> Env
    Env --> Config
    
    style Base fill:#dae8fc,stroke:#6c8ebf,color:#000
    style Env fill:#dae8fc,stroke:#6c8ebf,color:#000
    style Config fill:#dae8fc,stroke:#6c8ebf,color:#000
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
            │   - supportedEvents() → [String]
            │   - constantsToExport() → ["supportedEvents": ...]
            │   - sendSubmitEvent(data)
            │   - sendCompleteEvent()
            │   - sendProvideEvent(actionData)
            │   - PaymentComponentDelegate
            │   - ActionComponentDelegate
            │   - CardComponentDelegate
            │
            ├──► ApplePayModule                      # Apple Pay component
            │       - open(paymentMethods, config)
            │       - isAvailable(paymentMethod, config)
            │
            ├──► BaseActionHandler                   # Adds handle() for actions
            │       │   - actionHandler: AdyenActionComponent?
            │       │   - handle(action)
            │       │
            │       └──► InstantModule               # Instant/redirect payments
            │               - open(paymentMethods, config)
            │
            └──► BaseAddressLookup                   # Adds address lookup support
                    │   - update(results)
                    │   - confirm(success, address)
                    │   - AddressLookupProvider protocol
                    │
                    └──► DropInModule                # Drop-in component
                            - open(paymentMethods, config)
                            - handle(action)
                            - removeStored(success)
                            - getReturnURL()
                            - provideBalance/Order/PaymentMethods
                            - DropInComponentDelegate
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

### Event Emission: iOS BaseModuleSender vs Android MessageBus

Both platforms use a centralized event emission layer that translates native SDK callbacks to JS events:

| Aspect               | iOS (`BaseModuleSender`)                                                       | Android (`MessageBus`)                                         |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Role**             | Base class with event helper methods                                           | Aggregator implementing messenger protocols                    |
| **Inheritance**      | Modules extend `BaseModuleSender`                                              | Modules hold `MessageBus` instance                             |
| **Event helpers**    | `sendSubmitEvent()`, `sendCompleteEvent()`, `sendProvideEvent()`               | `onSubmit()`, `onFinished()`, `onAdditionalDetails()`          |
| **Delegate support** | `PaymentComponentDelegate`, `ActionComponentDelegate`, `CardComponentDelegate` | `SessionMessenger`, `AdvancedMessenger`, `CardMessenger`, etc. |
| **Emission target**  | `sendEvent(withName:body:)` via `RCTEventEmitter`                              | `RCTDeviceEventEmitter.emit()` via `Emitter` interface         |

```mermaid
flowchart TB
    Callback["Native SDK Callback"]
    
    iOS["iOS: BaseModuleSender<br/><br/>- sendSubmitEvent(data)<br/>- sendCompleteEvent()<br/>- sendProvideEvent(action)"]
    
    Android["Android: MessageBus<br/><br/>- onSubmit(state, returnUrl)<br/>- onFinished()<br/>- onAdditionalDetails(data)"]
    
    RCT["RCTEventEmitter<br/><br/>sendEvent(withName:body:)"]
    
    Emitter["Emitter → MessageBusEmitter<br/>→ RCTDeviceEventEmitter"]
    
    JSHandler["JavaScript Event Handler"]
    
    Callback --> iOS
    Callback --> Android
    iOS --> RCT
    Android --> Emitter
    RCT --> JSHandler
    Emitter --> JSHandler
    
    style Callback fill:#e1e1e1,stroke:#666,color:#000
    style iOS fill:#ffe6cc,stroke:#d79b00,color:#000
    style Android fill:#ffe6cc,stroke:#d79b00,color:#000
    style RCT fill:#d0cee2,stroke:#56517e,color:#000
    style Emitter fill:#d0cee2,stroke:#56517e,color:#000
    style JSHandler fill:#dae8fc,stroke:#6c8ebf,color:#000
```

## Common Native Module Patterns

### Lifecycle Pattern

Both platforms follow a consistent lifecycle for payment components:

1. **Session Setup** (optional) - `SessionHelperModule.createSession()` stores session in static/companion property
2. **Open** - Module sets `currentModule = self/this`, initializes component, presents UI
3. **Events** - Native SDK callbacks are translated to JS events via emitter
4. **Hide** - Cleanup resources, dismiss UI, clear static references

```mermaid
flowchart LR
    Session["Session<br/>(opt.)<br/><br/>Store session<br/>in static prop"]
    Open["Open<br/><br/>Set currentModule<br/>Present UI"]
    Events["Events<br/><br/>Emit to JS<br/>via emitter"]
    Hide["Hide<br/><br/>Clear refs<br/>Dismiss UI"]
    
    Session --> Open --> Events --> Hide
    
    style Session fill:#fff2cc,stroke:#d6b656,color:#000
    style Open fill:#d5e8d4,stroke:#82b366,color:#000
    style Events fill:#dae8fc,stroke:#6c8ebf,color:#000
    style Hide fill:#ffe6cc,stroke:#d79b00,color:#000
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

```mermaid
flowchart LR
    Error["Error occurs"]
    Check{"session != nil?"}
    SessionErr["Session Error<br/>(failSession)"]
    AdvancedErr["Advanced Error<br/>(fail)"]
    
    Error --> Check
    Check -->|YES| SessionErr
    Check -->|NO| AdvancedErr
    
    style Error fill:#ffcccc,stroke:#cc0000,color:#000
    style Check fill:#fff2cc,stroke:#d6b656,color:#000
    style SessionErr fill:#ffe6cc,stroke:#d79b00,color:#000
    style AdvancedErr fill:#ffe6cc,stroke:#d79b00,color:#000
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

| Event                          | Description                      |
| ------------------------------ | -------------------------------- |
| `onSubmit`                     | Payment details submitted        |
| `onAdditionalDetails`          | Additional action details needed |
| `onComplete`                   | Payment completed (vouchers)     |
| `onError`                      | Error occurred                   |
| `onDisableStoredPaymentMethod` | Stored payment removal requested |
| `onAddressUpdate`              | Address lookup update            |
| `onAddressConfirm`             | Address confirmed                |
| `onCheckBalance`               | Balance check requested          |
| `onRequestOrder`               | New order requested              |
| `onCancelOrder`                | Order cancelled                  |
| `onBinValue`                   | BIN value changed                |
| `onBinLookup`                  | BIN lookup completed             |

