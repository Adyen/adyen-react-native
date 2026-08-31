# Architecture

> [!NOTE]
> This document reflects the v6 alpha architecture. For migration details from v5, see
> `docs/ios-bridge-migration-guide.md` and `docs/android-bridge-migration-guide.md`.

## Data Flow

![Data Flow](./assets/Architecture.png)

## Checkout Lifecycle Contract

The SDK exposes a **single active checkout** at a time, mirroring the native iOS/Android SDKs, which
keep one checkout context in static/companion state. The rules below are enforced (or deliberately
not enforced) by `src/AdyenCheckout.ts`:

| Rule | Behaviour |
| ---- | --------- |
| **Setup is required** | A `Checkout` is only obtainable by awaiting `AdyenCheckout.setup()` / `setupAdvanced()`. It has no public constructor, so its methods cannot be called before the native context exists. |
| **One active checkout** | Each setup replaces the previous checkout. There is no support for two independent checkouts (e.g. on two screens) at the same time. |
| **Setup calls must not overlap** | `setup()` / `setupAdvanced()` are `async` and are **not** serialized or rejected by the SDK. Calling them concurrently is an integration error: the last native setup to resolve wins, and earlier listeners are already replaced. Always `await` one setup before starting another. |
| **Re-setup clears JS state only** | On re-setup the JS side unsubscribes embedded views, removes context listeners and resets callbacks; it does **not** call native `cleanup()`. The native side replaces its own state when it receives the new setup call. |
| **Terminal events fire once** | The first `onComplete` / `onError` per checkout invokes the merchant callback and then triggers auto-cleanup. Later or duplicate terminal events for the same checkout are ignored. |
| **Abandoned flows need `invalidate()`** | `checkout.invalidate()` tears the checkout down when the shopper leaves without a terminal callback (e.g. navigating away). It is idempotent, suppresses any terminal event still queued for that checkout, and is the only consumer-facing teardown API. |
| **Teardown is once per checkout** | Native `cleanup()` runs from the terminal-event path or from `invalidate()`, whichever happens first, and is a no-op afterwards. |
| **A stale handle is inert** | After teardown, `submit()` / `isAvailable()` / `requiresUserInteraction()` / `subscribe()` on that `Checkout` are ignored and log a warning; `isAvailable` and `requiresUserInteraction` report `false`. `unsubscribe()` still runs so unmounting views can detach, and `invalidate()` stays a silent no-op. |

Because a checkout is global, a terminal event tears down **all** embedded `<AdyenComponent>`
views attached to it, not only the view that produced the event.

### Presenters within one checkout

Drop-in and embedded `<AdyenComponent>` views share the single checkout, and both can drive the
full event set (session or advanced, per the configuration used at setup). They are expected to be
used **sequentially, not in parallel**:

- Embedded component events are tagged with the view's `viewId` and filtered per view, so a
  component never reacts to Drop-in's events.
- Drop-in and headless/context events are untagged and arrive on the shared context listeners.
  When Drop-in is presented it is treated as the **dominant emitter** for those events.

> [!WARNING]
> Because Drop-in and context events are indistinguishable on the JS side, advanced-flow results
> from the context listeners are currently dispatched to the Drop-in module. A headless
> `checkout.submit(type)` in the **advanced** flow therefore does not yet resolve correctly
> (Android also lacks a context-level `action` bridge, and its `ContextModule.completion()` tears
> the context down instead of resuming the pending `ComponentManager` continuation). Use Drop-in or
> embedded components for the advanced flow until this is addressed.

## Directory Structure

```
src/
├── index.ts                              # Main entry point (barrel exports)
├── components/                           # React components
│   ├── index.ts
│   ├── AdyenCheckout.ts                    # Static checkout class (setup, setupAdvanced, cleanup)
│   ├── AdyenComponent.tsx                  # Generic embedded payment view (checkout, type props)
│   ├── utils/                              # Component utilities
│   │   ├── checkConfiguration.ts             # Configuration validation
│   │   └── startEventListeners.ts            # Event listener setup for native components
│   └── common/
│       └── Styles.ts                         # Shared styles
├── core/                                 # Core types, constants, and configurations
│   ├── index.ts
│   ├── Checkout.ts                         # Checkout interface + factory (isAvailable, requiresUserInteraction, submit)
│   ├── types.ts                            # Payment types and component interfaces
│   ├── constants.ts                        # Event enums, error codes, result codes
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
├── plugin/                               # Expo config plugins
│   ├── withAdyen.ts                        # Main plugin entry
│   ├── withAdyenIos.ts                     # iOS-specific configuration
│   ├── withAdyenAndroid.ts                 # Android-specific configuration
│   └── ...                                 # Platform setup utilities
├── specs/                                # Fabric codegen specs
│   └── NativeAdyenComponentView.ts          # Generic component view spec (type, configuration, onLayoutChange)
└── modules/                              # Native module wrappers
    ├── index.ts
    ├── base/                               # Base wrapper classes
    │   ├── EventListenerWrapper.ts           # Abstract base for event handling
    │   ├── AddressLookupModule.ts            # Base with address lookup + action/completion/retry
    │   ├── ModuleMock.ts                     # Mock for unavailable modules
    │   ├── constants.ts                      # Module-specific constants
    │   └── utils.ts                          # Utility functions
    ├── action/                             # Standalone action handler
    │   ├── AdyenAction.ts
    │   └── ActionModuleWrapper.ts
    ├── component/                          # Embedded component bus (per-viewId routing)
    │   ├── ComponentBus.ts                   # Singleton bus instance
    │   ├── ComponentBusWrapper.ts            # Wrapper with subscribe/unsubscribe/action/completion/retry
    │   └── ComponentProxy.ts                 # Per-component proxy that binds a viewId to bus calls
    ├── context/                            # Checkout context lifecycle (session + advanced setup)
    │   ├── ContextModule.ts                  # AdyenContext module interface
    │   ├── ContextModuleWrapper.ts           # Wrapper: createSession, setup, isAvailable, requiresUserInteraction, submit
    │   └── types.ts
    ├── cse/                                # Client-side encryption
    │   ├── types.ts
    │   ├── AdyenCSEModule.ts
    │   └── AdyenCSEModuleWrapper.ts
    └── dropin/                             # Drop-in module
        ├── AdyenDropIn.ts                    # DropInModule interface: start(checkout), getReturnURL
        └── DropInWrapper.ts                  # Wrapper: start calls nativeModule.open(paymentMethods)
```

## Class Hierarchy

### TypeScript Module Wrappers

```
EventListenerWrapper<T>                                      # Abstract - manages event subscriptions
    │                                                          - reads supportedEvents from getConstants()
    │                                                          - isSupported(event)
    │                                                          - addListener/removeListeners
    ▼
AddressLookupModule<T>                                       # Abstract - adds action(), completion(), retry()
    │                                                          - update(), confirm()
    │
    └──► DropInWrapper                                       # implements DropInModule
            + start(checkout) → open(checkout.paymentMethods)
            + getReturnURL()
            + removeStored()                       (TODO: not yet supported)
            + provideBalance/Order/PaymentMethods  (TODO: not yet supported)
```

### Embedded Component Wrappers

These handle communication for inline embedded `<AdyenComponent>` views:

```
EventListenerWrapper<ComponentNativeModule>
    │
    └──► ComponentBusWrapper                                 # Bus for all embedded views
            - subscribe(key), unsubscribe(key)
            - action(key, action), completion(key, resultCode), retry(key, message)
            - update(key, results), confirm(key, success, body)

ComponentProxy                                               # Per-view proxy (not a wrapper subclass)
    implements AddressLookup, AdyenEventListener
    - constructor(wrapper, viewId)
    - action(action) → wrapper.action(key, action)
    - completion(resultCode) → wrapper.completion(key, resultCode)
    - retry(message) → wrapper.retry(key, message)
    - update/confirm/reject → wrapper.update/confirm(key, ...)
```

### Standalone Wrappers (outside hierarchy)

These don't inherit from `EventListenerWrapper` as they don't need event subscription management:

```
ContextModuleWrapper                                         # implements AdyenContextModule
    - createSession(session, config) → Promise<SessionContext>
    - setup(paymentMethods, config) → Promise<void>
    - isAvailable(type) → Promise<boolean>
    - requiresUserInteraction(type) → Promise<boolean>
    - submit(type)
    - action(action), completion(resultCode), retry(message?)
    - cleanup()
    - assign*Handler() methods for event subscriptions
    - removeAllListeners()

ActionModuleWrapper                                          # implements ActionModule
    - action(action, config) → Promise<PaymentDetailsData>
    - completion(resultCode)
    - retry(message?)
    - threeDS2SdkVersion

AdyenCSEModuleWrapper                                        # implements AdyenCSEModule
    - encryptCard(card, publicKey)
    - encryptBin(bin, publicKey)
```

## Result Types

### Core Types (`core/types.ts`)

```
SubmitResult                      # Union type returned from onSubmit
    { type: 'action', action }
    { type: 'completed', resultCode }
    { type: 'retry', message? }

AdditionalDetailsResult           # Returned from onAdditionalDetails
    { resultCode: string }

BeforeSubmitResult                # Union type returned from onBeforeSubmit
    { type: 'proceed', data, sessionData? }
    { type: 'abort' }
```

**Public module interfaces:**

- `DropInModule` — action, completion, retry methods + partial payment methods
- `AdyenContextModule` — lifecycle: createSession, setup, isAvailable, requiresUserInteraction, submit, cleanup
- `ActionModule`, `AdyenCSEModule` — standalone

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
    │   - checkoutState: CheckoutState? (static) — owns checkout lifecycle
    │   - sdkVersion: String? (static, lock-guarded)
    │   - presenterStack: [UIViewController] (static)
    │   - currentPresenter: UIViewController? (static, computed — presenterStack.last)
    │   - topPresenterProvider (static, overridable in tests)
    │   - completion(_ resultCode:) — dismisses; subclasses resume continuations
    │   - retry(_ message:) — no-op; subclasses resume continuations
    │   - present(component)
    │   - cleanUp()
    │   - sendError(error)
    │
    ├──► ActionModule                                # Standalone action handler (Promise-based)
    │       - action(_ dictionary:) → Promise
    │       - completion(_ resultCode:)
    │       - retry(_ message:)
    │       - Uses ActionOnlyCheckout via Checkout.setup(configuration:)
    │
    └──► BaseModuleSender                            # Adds event sending helpers + v6 callback wiring
            │   - checkout: BaseCheckout?
            │   - submitContinuation: CheckedContinuation<SubmitResult>
            │   - additionalDetailsContinuation: CheckedContinuation<AdditionalDetailsResult>
            │   - supportedEvents() → [String]
            │   - sendSubmitEvent(data), sendCompleteEvent(), sendProvideEvent(actionData)
            │   - action(), completion(), retry() — resume continuations from JS
            │
            └──► BaseAddressModule                   # Adds address lookup support
                    │   - update(results)
                    │   - confirm(success, address)
                    │
                    ├──► ContextModule               # Unified lifecycle + headless APIs
                    │       (@objc(AdyenContext))
                    │       - createSession(session, config) — session flow setup
                    │       - setup(paymentMethods, config) — advanced flow setup
                    │       - isAvailable(type), requiresUserInteraction(type), submit(type)
                    │       - cleanup()
                    │       - Apple Pay callback bridging (via extension)
                    │       - Caches CheckoutPaymentComponent per type
                    │
                    ├──► DropInModule                # Drop-in component
                    │       - open(paymentMethods) — uses BaseModule.checkoutState
                    │       - action(action), completion(resultCode), retry(message)
                    │       - removeStored(success) (TODO: not yet supported)
                    │       - getReturnURL()
                    │
                    └──► ComponentModule             # Embedded component bus (singleton)
                            (@objc(AdyenComponent))
                            - delegates: [String: ComponentProxy]
                            - subscribe/unsubscribe (JS lifecycle)
                            - register/unregister (native view lifecycle)
                            - action/completion/retry/update/confirm (JS → native routing)
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
    │       - action(action, config) → Promise
    │       - completion(resultCode), retry(message)
    │       - Uses ActionOnlyCheckoutCallbacks
    │
    ▼
BaseModule                                           # Base class for payment modules
    │   - checkoutState: CheckoutState? (companion, @Volatile) — owns checkout lifecycle
    │   - sdkVersion: String? (companion, @Volatile)
    │   - configureAnalytics() (companion)
    │   - messageBus: MessageBus
    │   - supportedEvents(): List<String> (abstract)
    │   - getConstants() → ["supportedEvents": ...]
    │   - cleanup() (open — subclasses extend teardown)
    │   - sendError(exception)
    │
    └──► BaseActionModule                            # Adds parseActionFromMap() + mainEvents()
            │
            └──► BaseAddressModule                   # Adds parseAddressOptions/parseLookupAddress()
                    │
                    ├──► ContextModule               # Unified lifecycle + headless APIs
                    │       ("AdyenContext")
                    │       - createSession(session, config) — session flow setup
                    │       - setup(paymentMethods, config) — advanced flow setup
                    │       - isAvailable(type), requiresUserInteraction(type), submit(type)
                    │       - cleanup() — disposes all cached ComponentManagers
                    │       - controllers: Map<type, ComponentManager>
                    │
                    ├──► DropInModule                # Drop-in component
                    │       - open(paymentMethods) — uses BaseModule.checkoutState
                    │       - action(action), completion(resultCode), retry(message)
                    │       - removeStored(success) (TODO: not yet supported)
                    │       - getReturnURL()
                    │       - Uses DropInLauncher + AdvancedCheckoutService
                    │
                    └──► ComponentModule             # Embedded component bus
                            ("AdyenComponent")
                            - consumers: Map<String, ComponentContract> (companion, keyed by reactTag)
                            - subscribe/unsubscribe (JS lifecycle)
                            - register/unregister (native view lifecycle)
                            - action/completion/retry/update/confirm (JS → native routing)
```

### Embedded Views (Fabric Native Components)

Embedded views are rendered inline within the React tree using Fabric codegen. Unlike modal-based modules (Drop-in), they don't use `open()`/`hide()` — instead, props drive initialization and the ComponentModule event bus routes callbacks.

![Embedded Views](./assets/Embedded%20Views.png)

#### Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  JS Layer                                                                │
│                                                                          │
│  AdyenComponent.tsx                                                      │
│    ├── ref → findNodeHandle() → reactTag                                 │
│    ├── subscribe(reactTag) → ComponentBus                                │
│    └── <NativeAdyenComponentView type={...} configuration={...} />       │
│                                                                          │
│  SubscriptionManager (internal)                                          │
│    ├── ComponentBus.subscribe(key)                                       │
│    ├── ComponentProxy(bus, key) → startEventListeners()                  │
│    └── Filters incoming events by viewId === key                         │
│                                                                          │
│  ComponentProxy                                                          │
│    └── action(action), completion(), retry(), update(), confirm() → bus  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Native Layer (per-platform)                                             │
│                                                                          │
│  ViewManager creates view → props set → renderComponentIfNeeded()        │
│    ├── Creates Adyen SDK component (via CheckoutController / Compose)    │
│    ├── Registers with ComponentModule using reactTag key                 │
│    └── TaggedEmitter tags all outgoing events with reactTag              │
│                                                                          │
│  ComponentModule                                                         │
│    ├── register(key, contract) — maps reactTag → native view state       │
│    ├── action(key, action) — routes actions from JS to correct view      │
│    ├── completion(key, resultCode) — completes payment for correct view  │
│    ├── retry(key, message) — retries payment for correct view            │
│    └── unregister(key) — cleanup on dispose                              │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Multi-Instance Support

Each embedded view instance uses its **reactTag** (view ID) as the bus registration key. Only one `<AdyenComponent>` per payment method `type` may be mounted at a time (enforced by the `activeComponentTypes` set in `AdyenComponent.tsx`):

- **JS**: `findNodeHandle(ref)` → `subscribe(String(tag))`
- **Android**: `view.id.toString()` → `register(key, this)` + `TaggedEmitter(emitter, key)`
- **iOS**: `self.tag` → `viewId` → `register(viewId:)`

Events are tagged with the reactTag and filtered on the JS side by `startEventListeners`, which checks `rawData.viewId === key`.

#### Android Embedded View Classes

```
SimpleViewManager<DynamicComponentView> (React Native)
    │
    └──► AdyenComponentViewManager                   # Generic Fabric ViewManager ("AdyenComponentView")
            - viewStates: Map<View, AdyenComponentViewState> (per-view state)
            - createViewInstance() → DynamicComponentView
            - onAfterUpdateTransaction() → state.renderView()
            - onDropViewInstance() → state.dispose()
            - setType/setConfiguration (prop setters)

AdyenComponentViewState                              # Per-view state holder
    implements LayoutListener, ComponentContract
    - type, configuration (props from JS)
    - viewId (reactTag)
    - componentManager: ComponentManager             # Unified manager for all payment methods
    - renderView(view) — creates ComposeView + CheckoutPaymentFlow, registers with bus
    - dispose(view) — unregisters, clears state
    - onAction/onFinalResult — delegates to componentManager

ComponentManager                                     # Unified manager for all embedded components (in component/base/)
    - createController(checkoutContext, type) → CheckoutController
    - handleAction(action)
    - finish() / dispose()
    - Uses CheckoutPaymentFlow composable in ComposeView

DynamicComponentView : FrameLayout                   # Auto-resizing container
    - isViewSet: Boolean
    - layoutListener: LayoutListener
    - setView(view) — adds child, starts polling resize
    - onDispose() — stops polling, clears children

ComponentContract                                    # Interface for bus → view communication
    - onAction(action)
    - onFinalResult(success, message)
```

#### iOS Embedded View Classes

```
RCTViewComponentView (Fabric)
    │
    └──► ADYAdyenComponentView                       # Generic Fabric component view
            - updateProps() → sets viewId, type, forwards to proxy
            - prepareForRecycle() → proxy.dispose()
            - AdyenComponentViewProxyDelegate (layout changes → eventEmitter)

AdyenComponentViewProxy : UIStackView                # Component lifecycle manager
    - type, configuration (parsed NSDictionary)
    - viewId (reactTag from parent ADYAdyenComponentView)
    - isViewSet: Bool
    - renderComponentIfNeeded() — creates component, registers with bus
    - createComponent() → CheckoutPaymentComponent via checkout.createPaymentComponent(for:)
    - embedComponentView() — VC containment + scroll disable
    - dispose() — unregisters, tears down VC hierarchy
    - reportContentHeight() → delegate.onLayoutChange

ComponentModule : BaseAddressModule                  # Singleton bus (shared instance)
    (@objc(AdyenComponent))
    - delegates: [String: ComponentProxy]
    - register(viewId:) → ComponentProxy
    - unregister(viewId:)
    - subscribe/unsubscribe (JS lifecycle)
    - action/completion/retry/update/confirm (JS → native routing)

ComponentProxy                                       # Per-view delegate that tags events (@MainActor)
    - viewId: String (reactTag)
    - checkout: PaymentCheckout?, paymentComponent: CheckoutPaymentComponent?
    - submitContinuation, additionalDetailsContinuation
    - taggedBody() — injects viewId into event payloads
    - Wires onSubmit/onAdditionalDetails/onComplete/onFailure closures
    - Handles BIN change/lookup via CardConfiguration closures
```

#### Event Tagging (Android TaggedEmitter / iOS ComponentProxy)

Both platforms inject a `viewId` field (the view's **reactTag**) into every event payload so the JS side can demux events from multiple simultaneous embedded views:

| Platform | Mechanism | Tags with |
|----------|-----------|-----------|
| Android  | `TaggedEmitter` wraps `MessageBusEmitter` | `jsonObject.put("viewId", viewId)` |
| iOS      | `ComponentProxy.taggedBody()` | `dict["viewId"] = viewId` |

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

## Common Native Module Patterns

### Lifecycle Pattern

Both platforms follow a consistent lifecycle for payment components:

1. **Context Setup** - `ContextModule.createSession()` or `ContextModule.setup()` stores checkout state in the static/companion property
2. **Open/Start** - Module uses `BaseModule.checkoutState` to create and present components
3. **Events** - Native SDK callbacks are translated to JS events via emitter (or via closure-based callbacks on iOS)
4. **Complete/Retry** - Resume suspended continuations, cleanup resources, dismiss UI

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Setup     │────►│  Open/Start │────►│   Events    │────►│ Complete/Retry   │
│ (required)  │     │             │     │             │     │                  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────────┘
      │                   │                   │                       │
      ▼                   ▼                   ▼                       ▼
 Store checkout     Uses checkoutState   Emit to JS             Resume continuation
 state in static    Present UI           via emitter            Dismiss UI
```

### Static State Management

Both platforms use static/companion properties for cross-module coordination:

| Property           | iOS                        | Android                       | Purpose                                          |
| ------------------ | -------------------------- | ----------------------------- | ------------------------------------------------ |
| `checkoutState`    | `static var`               | `companion object` `@Volatile` | Shared checkout state (context + `isSession`)    |
| `sdkVersion`       | `static var` (lock-guarded) | `companion object` `@Volatile` | Cross-platform analytics version                 |
| `presenterStack`   | `static var`               | N/A                            | iOS presented view controller chain              |
| `currentPresenter` | computed (`presenterStack.last`) | N/A                      | iOS presenter view controller                    |

> [!NOTE]
> The v5 `currentModule` delegation property was removed. Drop-in `action` / `completion` / `retry`
> now route directly from TypeScript to the `AdyenDropIn` native module, and embedded components
> route by `viewId` through `ComponentModule`.

### Error Routing Pattern

Errors are routed differently based on integration type:

```
                    ┌─────────────────┐
                    │  Error occurs   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ checkoutState    │
                    │ isSession?      │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │ YES                         │ NO
              ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ Session Error   │           │ Advanced Error  │
    │ (onFailure)     │           │ (onFailure)     │
    └─────────────────┘           └─────────────────┘
```

### Completion/Retry Pattern

Each module resolves its **own** pending work — there is no cross-module delegation. Which module
receives a JS result depends on how the payment was started (context/headless, Drop-in, or an
embedded view).

#### Continuation-based flows (headless / embedded)

`ContextModule` (iOS) and `ComponentManager` (Android) suspend the SDK's `onSubmit` /
`onAdditionalDetails` closures on a continuation and resume it with the result forwarded from JS.
When no continuation is pending, the call is a no-op.

| JS call                  | iOS `ContextModule` resumes with          | Android `ComponentManager` resumes with               |
| ------------------------ | ----------------------------------------- | ----------------------------------------------------- |
| `action(action)`         | `.action(action)`                         | `SubmitResult.Action(action)`                         |
| `completion(resultCode)` | `.completion(resultCode:)` — submit *or* additional-details continuation | `SubmitResult.Completion` *or* `AdditionalDetailsResult.Completion` |
| `retry(message)`         | `.retry(errorMessage:)`                   | `SubmitResult.Retry(message)`                         |

On teardown (`cleanup()` / re-`setup` on iOS, `dispose()` on Android) any still-suspended
continuation is settled with the SDK's error result code — iOS uses the shared
`errorSubmitResult` / `errorAdditionalDetailsResult` constants — so a cancelled flow ends
terminally instead of looking like a shopper-initiated retry.

iOS `ComponentProxy` uses the same pattern per `viewId`, so a result only affects the embedded view
it was routed to. Android `ContextModule.completion()` tears the checkout context down, and its
`retry()` only guards against a missing checkout state.

#### Drop-in flow (Android)

Advanced Drop-in results are forwarded to the Drop-in service rather than a continuation:

| JS call                  | Result sent to the service              |
| ------------------------ | --------------------------------------- |
| `action(action)`         | `DropInServiceResult.Action(action)`    |
| `completion(resultCode)` | `DropInServiceResult.Finished(resultCode)` |
| `retry(message)`         | `DropInServiceResult.Error(null, message, true)` |

> [!NOTE]
> Session-flow Drop-in is not supported in the v6 alpha; `start()` reports a `notSupported` error.

### Event Emission Differences

| Aspect            | iOS                             | Android                           |
| ----------------- | ------------------------------- | --------------------------------- |
| Base class        | `RCTEventEmitter`               | `ReactContextBaseJavaModule`      |
| Emit method       | `sendEvent(withName:body:)`     | `RCTDeviceEventEmitter.emit()`    |
| Event declaration | `supportedEvents() -> [String]` | `supportedEvents(): List<String>` |
| Constants export  | `constantsToExport()`           | `getConstants()`                  |

### Callback Pattern

Both platforms translate native SDK callbacks to JS events. The JS-facing API uses `action()`/`completion()`/`retry()`:

**iOS** — Closure callbacks (v5 delegate protocols removed):

```swift
// BaseModuleSender+Callbacks.swift
checkout.onSubmit { [weak self] data in
    await self?.awaitSubmitResult(for: data) ?? errorSubmitResult
}
// awaitSubmitResult sends the event to JS and suspends on a CheckedContinuation
// until JS calls action(), completion(), or retry()
```

**Android** — MessageBus delegation:

The SDK callback is forwarded to `MessageBus`, which serializes the payload and emits it through
`Emitter` to JS. The advanced flow suspends on `suspendCancellableCoroutine` in `ComponentManager`
until JS calls `action()`, `completion()`, or `retry()`.

```kotlin
// AdvancedMessengerImpl — serializes and emits the submit event
override fun onSubmit(data: PaymentComponentData<*>) {
  val jsonObject = PaymentComponentData.SERIALIZER.serialize(data)
  val submitData = SubmitData(jsonObject, null)
  // → emitter.sendEvent(...)
}
```

## Event System

Events flow through two paths depending on the module:

1. **ContextModule** — Uses `ContextModuleWrapper` with `NativeEventEmitter` and per-event subscription via `assign*Handler()` methods. Re-`setup()` calls replace previous listeners so handlers never accumulate.
2. **ComponentModule / DropInModule** — Supported events are exposed via `getConstants()` and read by the JS wrapper at construction:

```typescript
// EventListenerWrapper constructor reads from native module
constructor(nativeModule: T) {
  this.nativeModule = nativeModule;
  const constants = nativeModule.getConstants?.();
  this.supportedEvents = constants?.supportedEvents ?? [];
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

#### Fabric View Events (Direct Events via codegen)

| Event            | Component              | Description                          |
| ---------------- | ---------------------- | ------------------------------------ |
| `onLayoutChange` | `AdyenComponentView`   | Embedded view size changed (w × h)   |

