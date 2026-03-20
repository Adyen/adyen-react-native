# Architecture

## Data Flow

![Data Flow](./assets/Architecture.png)

## Directory Structure

```
src/
├── index.ts                                # Main entry point (barrel exports)
├── components/                             # React components
│   ├── index.ts
│   ├── AdyenCheckout.tsx                   # Main checkout component with context provider
│   ├── ApplePayButton.tsx                  # Apple Pay button component
│   ├── GooglePayButton.tsx                 # Google Pay button component
│   ├── CardView.tsx                        # Embedded Card component (Fabric/new architecture)
│   ├── common/
│   │   └── Styles.ts                       # Shared styles
│   └── utils/
│       ├── checkConfiguration.ts           # Configuration validation
│       ├── checkPaymentMethodsResponse.ts  # Payment methods response validation
│       └── startEventListeners.ts          # Shared event wiring for all payment components
├── core/                                   # Core types, constants, and configurations
│   ├── index.ts
│   ├── types.ts                            # Payment types and component interfaces
│   ├── constants.ts                        # Event enums, error codes, result codes
│   ├── components.ts                       # Payment method component mappings
│   └── configurations/                     # Configuration interfaces
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
│   ├── constants.ts                   # Error message constants
│   ├── useAdyenCheckout.ts            # Context hook for checkout state
│   ├── useComponent.ts                # Context type for embedded components
│   └── useEmbeddedComponentBus.ts     # Subscription manager hook for embedded components
├── plugin/                            # Expo config plugins
│   ├── withAdyen.ts                           # Main plugin entry
│   ├── withAdyenIos.ts                        # iOS-specific configuration
│   ├── withAdyenAndroid.ts                    # Android-specific configuration
│   └── ...                                    # Platform setup utilities
├── specs/                             # TurboModule specs
│   ├── NativePlatformPayView.ts       # Codegen spec for the embedded Apple and Google Pay
│   └── NativeCardView.ts              # Codegen spec for the embedded CardView
└── modules/                           # Native module wrappers
    ├── index.ts
    ├── base/                          # Base wrapper classes
    │   ├── EventListenerWrapper.ts            # Abstract base for event handling
    │   ├── ModuleWrapper.ts                   # Abstract base with hide()
    │   ├── PaymentComponentWrapper.ts         # Abstract base with open()
    │   ├── ActionHandlingComponentWrapper.ts  # Abstract base with handle()
    │   ├── AddressLookupModule.ts             # Abstract base with update/confirm/reject
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
    ├── embedded/                       # Embedded component bus
    │   ├── EmbeddedComponentBus.ts            # Singleton bus instance + raw native ref
    │   ├── EmbeddedComponentBusWrapper.ts
    │   └── EmbeddedComponentProxy.ts          # Per-componentType proxy for outbound calls
    └── session/                       # Session management
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
    └──► AddressLookupModule<T>                              # Abstract - adds update(), confirm(), reject()
            │   implements AddressLookup
            │
            └──► DropInWrapper                                # implements DropInModule
                    + getReturnURL()
                    + removeStored()                       (RemovesStoredPayment)
                    + provideBalance/Order/PaymentMethods  (PartialPayment)

EventListenerWrapper<T>
    │
    └──► EmbeddedComponentBusWrapper                          # name = 'AdyenComponentBus'
            (shared event bus for all embedded views)
            + subscribe/unsubscribe(componentType)
            + handle/hide/update/confirm(componentType, ...)
```

### Embedded Component Bus (Multi-Component)

Embedded (view-based) components such as `CardView` don't own a native module themselves. Instead, they share a single `EmbeddedComponentBus` (`AdyenComponentBus` native module). Multiple embedded components can be active simultaneously (e.g., `CardView` + future `SEPADirectDebitView`), with `componentType` (the payment method type string, e.g. `"scheme"`, `"sepadirectdebit"`) used as the routing key at every layer.

#### Event Flow

```
CardView (React)                           *SEPADirectDebitView (React)
    │  passes paymentMethod + config              │
    ▼                                             ▼
Native View (CardViewManager)              *Native View (SEPADirectDebitViewManager)
    │  extracts componentType from                │
    │  paymentMethod JSON ("scheme")              │ ("sepadirectdebit")
    ▼                                             ▼
    ├─────────────────────────────────────────────┘
    ▼
AdyenComponentBus (native module)         # single bus, routes by componentType
    │  every emitted event tagged with componentType
    ▼
useSubscriptionManager (useEmbeddedComponentBus.ts)
    │  per-componentType subscriptions: subscribe("scheme"), subscribe("ideal")
    │  creates EmbeddedComponentProxy per componentType
    ▼
startEventListeners (startEventListeners.ts)
    │  filters events by data.componentType
    │  unwraps tagged payloads (BIN value, BIN lookup, address)
    ▼
EventHandlerRefs (onSubmit, onError, onComplete, onAdditionalDetails, config)
```

#### Command Flow (JS → Native)

JS callbacks receive an `EmbeddedComponentProxy` bound to the specific `componentType`. When the merchant calls `component.handle(action)`, the proxy prepends `componentType` to the native call, and the native bus routes it to the correct ViewManager/delegate:

```
Merchant calls `component.handle(action)` (JS)
    │
    ▼
EmbeddedComponentProxy (componentType = "scheme") (JS)
    │  nativeModule.handle("scheme", action)
    ▼
AdyenComponentBus (native)
    │  looks up handler/delegate for "scheme"
    ▼
CardViewManager / CardComponentViewProxy
```

#### Event Tagging

Native emitters inject `componentType` into every event payload at emission time:

| Payload type    | Tagged shape                                      | JS unwrapping       |
| --------------- | ------------------------------------------------- | ------------------- |
| JSONObject      | `{ ...original, componentType: "scheme" }`        | Direct field access |
| String (BIN)    | `{ componentType: "scheme", value: "411111" }`    | `data.value`        |
| JSONArray (BIN) | `{ componentType: "scheme", data: [...] }`        | `data.data`         |
| Error           | `{ message, reason?, errorCode?, componentType }` | Direct field access |

**Android**: `TaggedEmitter` wraps the shared `MessageBusEmitter` and injects `componentType`.
**iOS**: `EmbeddedComponentDelegateProxy` conforms to all Adyen delegate protocols and tags every emitted event.

#### Android: Shared Emitter Architecture

```
AdyenPaymentPackage.ensureInitialized()
    │  creates singleton MessageBusEmitter + MessageBus (synchronized)
    │
    ├──► Modal modules (DropIn, Instant, GooglePay, ...)
    │       receive shared MessageBus (no tagging)
    │
    └──► Embedded ViewManagers (CardViewManager, ...)
            receive TaggedEmitter(sharedEmitter)
            │  TaggedEmitter wraps shared MessageBusEmitter
            │  injects componentType into every event
            │  creates MessageBus(taggedEmitter) lazily in createViewInstance
            ▼
        CardViewManager registers as consumers[componentType]
        in EmbeddedComponentBusModule for command routing
```

#### iOS: Shared Action Handler + Delegate Proxies

```
EmbeddedComponentBusModule (exposed as @objc "AdyenComponentBus")
    │
    ├── delegates: [String: EmbeddedComponentDelegateProxy]
    │     per-componentType, created on register(componentType:)
    │     conforms to PaymentComponentDelegate, ActionComponentDelegate,
    │     CardComponentDelegate, AddressLookupProvider
    │     tags every emitted event with componentType
    │     holds weak reference to bus (no retain cycle)
    │
    ├── actionHandler: AdyenActionComponent?
    │     single shared instance for all embedded views
    │     delegate swapped to correct proxy before each handle() call
    │     created lazily by createActionHandlerIfNeeded()
    │     torn down when all embedded views unregister
    │
    └── lookupHandlers / lookupCompletionHandlers
          per-componentType closures for address lookup
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

```
AdyenComponent                    # Base interface
    │   hide(success, option?)
    │
    └──► AdyenActionComponent     # Extends AdyenComponent
            + handle(action)

ConditionalPaymentComponent       # Standalone interface
    isAvailable(paymentMethod, configuration) → Promise<boolean>
```

**Public module interfaces** mirror this structure, extending core interfaces:

- `ApplePayModule` — extends `AdyenActionComponent`, `ConditionalPaymentComponent`
- `GooglePayModule` — extends `AdyenActionComponent`, `ConditionalPaymentComponent`
- `InstantModule` — extends `AdyenActionComponent`
- `DropInModule` — extends `AdyenActionComponent` + partial payment & address lookup methods
- `ActionModule`, `AdyenCSEModule`, `SessionHelperModule` — standalone

### Configuration Hierarchy

```
EnvironmentConfiguration
    │   environment, clientKey
    │
    └──► BaseConfiguration
            │   + analytics?, locale?
            │
            └──► Configuration
                    + returnUrl
                    + countryCode?
                    + amount?
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
BaseModule                                           # Base class for all modules
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
            └──► BaseActionModule                    # Adds handle() for actions
                    │   - actionHandler: AdyenActionComponent?
                    │   - handle(action)
                    │
                    ├──► InstantModule               # Instant/redirect payments
                    │       - open(paymentMethods, config)
                    │
                    └──► BaseAddressModule            # Adds address lookup support
                            │   - update(results)
                            │   - confirm(success, address)
                            │   - AddressLookupProvider protocol
                            │
                            ├──► DropInModule         # Drop-in component
                            │       - open(paymentMethods, config)
                            │       - handle(action)
                            │       - removeStored(success)
                            │       - getReturnURL()
                            │       - provideBalance/Order/PaymentMethods
                            │       - DropInComponentDelegate
                            │       - StoredPaymentMethodsDelegate
                            │       - PartialPaymentDelegate
                            │
                            └──► EmbeddedComponentBusModule  # Shared event bus for embedded views
                                    - delegates: [componentType: proxy]
                                    - actionHandler: shared AdyenActionComponent
                                    - routes commands by componentType
                                    - supportedEvents() → all card/embedded events
                                    - constantsToExport() → ["supportedEvents": ...]

RCTViewManager / UIView                              # Embedded (view-based) components
    │
    ▼
ADYCardViewManager                                   # ObjC view manager (Paper + Fabric bridge)
    │
    ▼
ADYCardView                                          # Native UIView hosting CardComponent
    │
    ▼
CardComponentViewProxy (Swift)                       # Mounts Adyen CardComponent
    │   - extracts componentType from paymentMethod JSON
    │   - registers EmbeddedComponentDelegateProxy with bus
    │   - uses proxy as delegate instead of bus directly
    ▼
EmbeddedComponentDelegateProxy                       # Per-component delegate
    │   - conforms to PaymentComponentDelegate,
    │     ActionComponentDelegate, CardComponentDelegate,
    │     AddressLookupProvider
    │   - tags every emitted event with componentType
    │   - weak reference to bus (no retain cycle)
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
    └──► BaseActionModule                            # Adds action handling support
            │   - parseAndHandleAction(actionMap)
            │   - handleAction(action) (abstract)
            │   - sendAdditionalDetailsEvent()
            │   - sendCompleteEvent()
            │
            ├──► GooglePayModule                     # Google Pay component
            │       - open(paymentMethods, config)
            │       - handle(action)
            │       - isAvailable(paymentMethods, config)
            │
            ├──► InstantModule                       # Instant/redirect payments
            │       - open(paymentMethods, config)
            │       - handle(action)
            │
            └──► BaseAddressModule                   # Adds address lookup support
                    │   - update(results)
                    │   - confirm(success, address)
                    │   - sendAddressLookupResult() (abstract)
                    │
                    ├──► DropInModule                # Drop-in component
                    │       - open(paymentMethods, config)
                    │       - handle(action)
                    │       - removeStored(success)
                    │       - getReturnURL()
                    │       - provideBalance/Order/PaymentMethods
                    │
                    └──► EmbeddedComponentBusModule  # Shared event bus for embedded views
                            - name = "AdyenComponentBus"
                            - consumers: [componentType → ComponentContract]
                            - commands take componentType as first param
                            - routes handle/update/confirm/hide by componentType
```

```
SimpleViewManager / DynamicComponentView             # Base for embedded Android views
    │
    ▼
CardViewManager                                      # Manages CardView native view
    │   - takes TaggedEmitter (wraps shared MessageBusEmitter)
    │   - extracts componentType from paymentMethod JSON
    │   - registers/unregisters with EmbeddedComponentBusModule.consumers
    │   - creates MessageBus(taggedEmitter) lazily
    │
    ▼
CardComponentManager                                 # Creates CardComponent (sessions or advanced)
        - createSessionCardComponent()
        - createAdvancedCardComponent()
        - ComponentSessionCallback / ComponentAdvancedCallback → MessageBus(TaggedEmitter)
```

### Event Emission: Modal vs Embedded Components

Modal components (Drop-in, Instant, etc.) each own a native module and emit events directly. Embedded (view-based) components share a single `AdyenComponentBus` native module:

| Aspect            | Modal components                       | Embedded components                                   |
| ----------------- | -------------------------------------- | ----------------------------------------------------- |
| **Native module** | One per component type                 | Shared `AdyenComponentBus`                            |
| **JS wiring**     | `AdyenCheckout` subscribes on `open()` | `useSubscriptionManager` subscribes per componentType |
| **Event source**  | Module's own `RCTEventEmitter`         | `EmbeddedComponentBus` singleton                      |
| **Routing**       | N/A (single component)                 | `componentType` in every event + command              |
| **JS proxy**      | Wrapper class (e.g. `DropInWrapper`)   | `EmbeddedComponentProxy` per componentType            |
| **Multiplicity**  | One at a time                          | Multiple simultaneous (e.g., Card + Ideal)            |
| **Examples**      | DropIn, Instant, GooglePay, ApplePay   | CardView                                              |

### Event Emission: iOS BaseModuleSender vs Android MessageBus

Both platforms use a centralized event emission layer that translates native SDK callbacks to JS events:

| Aspect               | iOS (`BaseModuleSender`)                                                       | Android (`MessageBus`)                                         |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| **Role**             | Base class with event helper methods                                           | Aggregator implementing messenger protocols                    |
| **Inheritance**      | Modules extend `BaseModuleSender`                                              | Modules hold `MessageBus` instance                             |
| **Event helpers**    | `sendSubmitEvent()`, `sendCompleteEvent()`, `sendProvideEvent()`               | `onSubmit()`, `onFinished()`, `onAdditionalDetails()`          |
| **Delegate support** | `PaymentComponentDelegate`, `ActionComponentDelegate`, `CardComponentDelegate` | `SessionMessenger`, `AdvancedMessenger`, `CardMessenger`, etc. |
| **Emission target**  | `sendEvent(withName:body:)` via `RCTEventEmitter`                              | `RCTDeviceEventEmitter.emit()` via `Emitter` interface         |

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           Native SDK Callback                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
              ┌─────────────────────────┴─────────────────────────┐
              ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│  iOS: BaseModuleSender        │               │  Android: MessageBus          │
│  - sendSubmitEvent(data)      │               │  - onSubmit(state, returnUrl) │
│  - sendCompleteEvent()        │               │  - onFinished()               │
│  - sendProvideEvent(action)   │               │  - onAdditionalDetails(data)  │
└───────────────────────────────┘               └───────────────────────────────┘
              │                                                   │
              ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│  RCTEventEmitter              │               │  Emitter → MessageBusEmitter  │
│  sendEvent(withName:body:)    │               │  → RCTDeviceEventEmitter      │
└───────────────────────────────┘               └───────────────────────────────┘
              │                                                   │
              └─────────────────────────┬─────────────────────────┘
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           JavaScript Event Handler                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Why iOS Has BaseModuleSender but Android Does Not

iOS and Android use different strategies for emitting events from native modules to JavaScript. On iOS, `RCTEventEmitter` is the base class for all modules that send events, and the only way to call `sendEvent(withName:body:)` is from within the module itself. This forces event emission logic into the class hierarchy: `BaseModuleSender` sits between `BaseModule` and `BaseActionModule` to provide shared helpers (`sendSubmitEvent`, `sendCompleteEvent`, `sendProvideEvent`) and Adyen SDK delegate conformances (`PaymentComponentDelegate`, `ActionComponentDelegate`, `CardComponentDelegate`). This also allows `ApplePayModule` to inherit event emission without inheriting action handling -- Apple Pay completes within its own payment sheet and never needs `handle(action)`.

On Android, event emission is decoupled from the module hierarchy entirely. Each module receives a `MessageBus` instance (via constructor injection) that implements the same messenger protocols (`SessionMessenger`, `AdvancedMessenger`, `CardMessenger`). The `MessageBus` delegates to an `Emitter` interface whose concrete implementation (`MessageBusEmitter`) calls `RCTDeviceEventEmitter.emit()`. Because emission is composition-based, there is no need for an intermediate base class -- `BaseModule` holds the `MessageBus` reference, and all subclasses can emit events without an extra inheritance layer.

As a result, the iOS hierarchy has four levels between `BaseModule` and `DropInModule` (`BaseModule` → `BaseModuleSender` → `BaseActionModule` → `BaseAddressModule` → `DropInModule`), while Android has three (`BaseModule` → `BaseActionModule` → `BaseAddressModule` → `DropInModule`). The final supported-events set is identical on both platforms; only the split point in the hierarchy differs.

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

| Event                          | Description                      | Modal | Embedded |
| ------------------------------ | -------------------------------- | :---: | :------: |
| `onSubmit`                     | Payment details submitted        |   ✓   |    ✓     |
| `onAdditionalDetails`          | Additional action details needed |   ✓   |    ✓     |
| `onComplete`                   | Payment completed (vouchers)     |   ✓   |    ✓     |
| `onError`                      | Error occurred                   |   ✓   |    ✓     |
| `onDisableStoredPaymentMethod` | Stored payment removal requested |   ✓   |          |
| `onAddressUpdate`              | Address lookup update            |   ✓   |    ✓     |
| `onAddressConfirm`             | Address confirmed                |   ✓   |    ✓     |
| `onCheckBalance`               | Balance check requested          |   ✓   |          |
| `onRequestOrder`               | New order requested              |   ✓   |          |
| `onCancelOrder`                | Order cancelled                  |   ✓   |          |
| `onBinValue`                   | BIN value changed                |   ✓   |    ✓     |
| `onBinLookup`                  | BIN lookup completed             |   ✓   |    ✓     |
