# Native Architecture

The iOS and Android bridges: exact class hierarchies, shared state, callback suspension, event
production, embedded views, headless presentation, and cleanup. For the lifecycle contract see
[Architecture.md](./Architecture.md); for the TypeScript layer see
[js-architecture.md](./js-architecture.md). Chronological flows live in
[public-api-flows.md](./public-api-flows.md) and capability status in
[FeatureSupport.md](./FeatureSupport.md).

## The shape both platforms share

```mermaid
flowchart TB
  JS(["JavaScript (NativeCheckout / AdyenComponent / AdyenDropIn / AdyenAction)"])

  subgraph N["Native module layer"]
    CTX["ContextModule<br/><i>@objc(AdyenCheckout)</i><br/>setup + shared checkout state"]
    CPM["ComponentModule<br/><i>@objc(AdyenComponent)</i><br/>embedded-view registry"]
    DIM["DropInModule<br/><i>@objc(AdyenDropIn)</i>"]
    ACT["ActionModule<br/><i>@objc(AdyenAction)</i><br/>standalone, promise-based"]
  end

  SDK["v6 native SDK<br/>session / advanced checkout"]

  JS <-->|"@ReactMethod / @objc + events"| N
  CTX -->|writes| STATE["shared checkout state"]
  CPM -->|reads| STATE
  DIM -->|reads| STATE
  N <-->|"closures + continuations"| SDK
```

`ContextModule` is the lifecycle owner on both platforms: it performs setup and holds the shared
checkout state that presenters read. The class ladders below are intentionally different between
the platforms.

## iOS class hierarchy

```mermaid
classDiagram
  class RCTEventEmitter
  class BaseModule {
    +checkoutState$ CheckoutState?
    +sdkVersion$ String?
    +presenterStack$ UIViewController[]
    +currentPresenter$ UIViewController?
    +cleanUp()
  }
  class BaseModuleSender {
    +resultSink: AdvancedResultSink
    +sendSubmitEvent() / sendCompleteEvent()
  }
  class BaseActionModule {
    +action(_:)
  }
  class BaseAddressModule {
    +update(results) / confirm(success, address)
  }
  class ContextModule {
    <<AdyenCheckout>>
    +resultSink: AdvancedResultSink
    +createSession() / setup()
    +action() / completion() / retry()
  }
  class ComponentModule {
    <<AdyenComponent>>
    +register() / unregister() / cleanUp()
  }
  class DropInModule {
    <<AdyenDropIn>>
    +start(paymentMethods)
  }
  class ActionModule {
    <<AdyenAction>>
    +handle(_:) / hide(_:)
  }

  RCTEventEmitter <|-- BaseModule
  BaseModule <|-- ContextModule
  BaseModule <|-- ComponentModule
  BaseModule <|-- ActionModule
  BaseModule <|-- BaseModuleSender
  BaseModuleSender <|-- BaseActionModule
  BaseActionModule <|-- BaseAddressModule
  BaseAddressModule <|-- DropInModule
```

Exact Swift declarations:

- `internal class BaseModule: RCTEventEmitter` (`ios/Components/Base/BaseModule.swift`)
- `internal final class ContextModule: BaseModule` — `@objc(AdyenCheckout)` (`ios/Components/ContextModule.swift`)
- `internal final class ComponentModule: BaseModule` — `@objc(AdyenComponent)` (`ios/Components/ComponentModule.swift`)
- `internal final class ActionModule: BaseModule` — `@objc(AdyenAction)` (`ios/CSE/ActionModule.swift`)
- `internal class BaseModuleSender: BaseModule` (`ios/Components/Base/BaseModuleSender.swift`)
- `internal class BaseActionModule: BaseModuleSender` (`ios/Components/Base/BaseActionModule.swift`)
- `internal class BaseAddressModule: BaseActionModule` (`ios/Components/Base/BaseAddressModule.swift`)
- `internal final class DropInModule: BaseAddressModule` — `@objc(AdyenDropIn)` (`ios/Components/DropIn/DropInModule.swift`)

> [!IMPORTANT]
> `ContextModule` and `ComponentModule` extend `BaseModule` **directly**. Neither is on the
> `BaseModuleSender` → `BaseActionModule` → `BaseAddressModule` → `DropInModule` ladder. The
> standalone `ActionModule` also extends `BaseModule` directly. The continuations for the advanced
> flow are composed via `AdvancedResultSink` rather than inherited from `BaseModuleSender`.

## Android class hierarchy

```mermaid
classDiagram
  class ReactContextBaseJavaModule
  class AppCompatModule {
    +appCompatActivity
  }
  class BaseModule {
    +checkoutState$ CheckoutState?
    +sdkVersion$ String?
    +messageBus: MessageBus
    +cleanup()
  }
  class BaseActionModule {
    +parseActionFromMap()
  }
  class BaseAddressModule {
    +parseAddressOptions() / parseLookupAddress()
  }
  class ContextModule {
    <<AdyenCheckout>>
    +componentManagers: Map
    +createSession() / setup()
    +action() / completion() / retry()
  }
  class ComponentModule {
    <<AdyenComponent>>
    +consumers: Map
    +register() / unregister()
  }
  class DropInModule {
    <<AdyenDropIn>>
    +start(paymentMethods)
  }
  class ActionModule {
    <<AdyenAction>>
    +handle() / hide()
  }

  ReactContextBaseJavaModule <|-- AppCompatModule
  AppCompatModule <|-- BaseModule
  AppCompatModule <|-- ActionModule
  BaseModule <|-- BaseActionModule
  BaseActionModule <|-- ContextModule
  BaseActionModule <|-- ComponentModule
  BaseActionModule <|-- BaseAddressModule
  BaseAddressModule <|-- DropInModule
```

Exact Kotlin declarations:

- `abstract class AppCompatModule(...) : ReactContextBaseJavaModule(reactContext)` (`component/base/AppCompatModule.kt`)
- `abstract class BaseModule(..., val messageBus: MessageBus) : AppCompatModule(reactContext)` (`component/base/BaseModule.kt`)
- `abstract class BaseActionModule(...) : BaseModule(reactContext, messageBus)` (`component/base/BaseActionModule.kt`)
- `abstract class BaseAddressModule(...) : BaseActionModule(reactContext, messageBus)` (`component/base/BaseAddressModule.kt`)
- `class ContextModule(...) : BaseActionModule(reactContext, messageBus)` (`component/ContextModule.kt`)
- `class ComponentModule(...) : BaseActionModule(context, messageBus)` (`component/ComponentModule.kt`)
- `class DropInModule(...) : BaseAddressModule(reactContext, messageBus)` (`component/dropin/DropInModule.kt`)
- `class ActionModule(...) : AppCompatModule(reactContext)` (`cse/ActionModule.kt`)

> [!IMPORTANT]
> The platforms differ on purpose. On Android, `ContextModule` and `ComponentModule` **both** extend
> `BaseActionModule`, `BaseAddressModule` extends `BaseActionModule`, and `DropInModule` extends
> `BaseAddressModule`. The standalone `ActionModule` extends `AppCompatModule` directly, so it has
> no `MessageBus` and does not participate in the shared checkout-state cleanup path. On iOS the
> corresponding modules sit at different points of a different ladder (see above).

## Shared state and presentation ownership

Both platforms keep the active checkout in process-wide state on `BaseModule`, written by context
setup and read by the presenters:

- **iOS**: `internal static var checkoutState: CheckoutState?`. Written in `ContextModule` session
  and advanced setup (`BaseModule.checkoutState = CheckoutState(...)`); read by
  `isAvailable`/`requiresUserInteraction`/`submit`, `sendError`, and the embedded proxy; cleared to
  `nil` in `BaseModule.cleanUp`.
- **Android**: `@Volatile internal var checkoutState: CheckoutState?` in the `BaseModule` companion
  object. Written in `ContextModule.setupSessionAsync`/`setupAdvancedAsync`; read the same way;
  cleared to `null` in `BaseModule.cleanup`.

Presentation ownership is asymmetric. Only **iOS** keeps a presenter stack on `BaseModule`:
`internal static var presenterStack: [UIViewController]` with the computed
`internal static var currentPresenter: UIViewController? { presenterStack.last }`. **Android has no
presenter stack**; it routes results through a map of component managers keyed by payment-method
type (below).

## Continuation ownership and routing

The v6 SDK drives the advanced flow with `async` closures (`onSubmit`, `onAdditionalDetails`) that
suspend until the merchant answers through JS. The two platforms own that suspension differently.

### iOS — one checkout-wide result sink

`ContextModule` wires the SDK closures **once**, at setup, in `setupAdvancedCallbacks(on:)`; nothing
re-points them afterward. Suspension goes through the checkout-wide `AdvancedResultSink`, which
composes one `CallbackBridge` per callback kind:

- `awaitSubmit`/`awaitAdditionalDetails` suspend on a single continuation slot;
- `resolveSubmit`/`resolveAdditionalDetails` resume it, and a `resolve` when nothing is pending is a
  no-op, so a late or duplicate result from JS cannot double-resume;
- a second suspension of the same callback kind supersedes the first, resuming the earlier
  continuation with the SDK error result before installing the new one.

Embedded proxies do **not** rewire callbacks. `ComponentProxy` owns a payment component
(`createPaymentComponent(for:)`) and nothing more; it never touches the checkout's closures. JS
`action`/`completion`/`retry` reach `ContextModule`, which resolves the applicable pending sink.

```mermaid
sequenceDiagram
  participant View as Fabric view
  participant CM as ComponentModule
  participant CP as ComponentProxy
  participant CTX as ContextModule
  participant SDK as AdvancedCheckout

  Note over CTX,SDK: setup() wires onSubmit / onAdditionalDetails once
  CTX->>SDK: setupAdvancedCallbacks(on:)
  View->>CM: register(viewId)
  CM->>CP: create proxy (owns a component, no callbacks)
  CP->>SDK: createPaymentComponent(for:)
  View->>CM: unregister(viewId)
  CM->>CP: dispose()
```

### Android — per-manager continuations selected by lookup

Each `ComponentManager` (`component/base/ComponentManager.kt`) owns its own `CheckoutController`
and its own `submitContinuation` / `additionalDetailsContinuation` (both via
`suspendCancellableCoroutine`). `ContextModule` keeps a `componentManagers: MutableMap<String,
ComponentManager>` keyed by payment-method type, and routes an incoming continuation command to the
first manager reporting it awaits a result:

```kotlin
private fun awaitingManager(): ComponentManager? =
  componentManagers.values.firstOrNull { it.isAwaitingResult }
```

`action`/`completion`/`retry` take only the payload — no presenter identity — and target whatever
`awaitingManager()` returns. `completion()` falls back to `cleanup()` when nothing is pending, which
preserves the session-flow behavior.

```mermaid
sequenceDiagram
  participant JS
  participant CTX as ContextModule
  participant CMG as ComponentManager
  participant SDK as AdvancedCheckout

  JS->>CTX: submit("scheme")
  CTX->>CMG: resolveController(type) get-or-create
  CMG->>SDK: submit()
  SDK->>CMG: onSubmit(data) suspends submitContinuation
  CMG->>JS: emit(onSubmit, data) via MessageBus
  JS->>CTX: action(actionMap)
  CTX->>CTX: awaitingManager() → first awaiting manager
  CTX->>CMG: handleAction → resume with SubmitResult.Action
  CMG-->>SDK: resume continuation
```

### Concurrent-routing ambiguity

The manager map is keyed by payment-method type, and continuation commands carry no presenter
identity, so routing can be ambiguous:

- On **Android**, multiple managers can await simultaneously; `awaitingManager()` selects the first
  awaiting map entry, and a same-type headless and embedded manager can replace one another in the
  map because registration is keyed by type (`getOrPut` / `registerManager` overwrite by type).
- On **iOS**, a second suspension of the same callback kind supersedes the first with the SDK error
  result (see the sink behavior above). No uniqueness guarantee is inferred from comments.

## Suspended callback cleanup fallbacks

Re-setup and terminal/`invalidate()` cleanup settle every still-suspended callback with an exact
fallback value so a cancelled flow ends terminally instead of hanging or looking like a fresh retry.

| Callback                              | iOS fallback on cancel/reset                           | Android fallback on cancel/reset                                    |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Advanced `onSubmit`                   | `errorSubmitResult` (`SubmitResult.completion(error)`) | `SubmitResult.Retry(null)` (on manager `dispose()`)                 |
| Advanced `onAdditionalDetails`        | `errorAdditionalDetailsResult` (completion, error)     | `AdditionalDetailsResult.Completion(ERROR)`                         |
| Session `onBeforeSubmit`              | `beforeSubmitBridge.resolve(.abort)`                   | `SessionBeforeSubmitBridge.cancel()` → `BeforeSubmitResult.Abort()` |
| Apple Pay authorization (iOS only)    | `.init(status: .failure, errors: nil)`                 | n/a                                                                 |
| Apple Pay shipping-contact (iOS only) | update with current summary items                      | n/a                                                                 |
| Apple Pay shipping-method (iOS only)  | update with current summary items                      | n/a                                                                 |
| Apple Pay coupon-code (iOS only)      | update with current summary items                      | n/a                                                                 |

On iOS these are driven from `ContextModule.cancelPendingOperations()`
(`resultSink.cancelPending()`, `beforeSubmitBridge.resolve(.abort)`, `cancelApplePayCallbacks()`).
On Android the advanced fallbacks come from `ComponentManager.dispose()` and the before-submit
fallback from `SessionBeforeSubmitBridge.cancel()`.

## Event production

Both platforms translate native SDK callbacks into JS events, but the ownership differs.

- **iOS**: modules that emit inherit event helpers. `BaseModuleSender` exposes `sendSubmitEvent` /
  `sendCompleteEvent` / `sendProvideEvent`, and `ContextModule` emits its own events through
  `RCTEventEmitter.sendEvent(withName:body:)`. `ComponentModule.supportedEvents()` returns `[]` — it
  emits nothing; every event the JS side subscribes to arrives through `ContextModule`.
- **Android**: there is **one** React Native event channel (`RCTDeviceEventEmitter`, keyed by event
  name) but **multiple** `MessageBus` producers emitting through it. `MessageBus`
  (`util/messaging/MessageBus.kt`) is composition by Kotlin `by` delegation over the small
  `SessionMessenger` / `AdvancedMessenger` / `PartialPaymentMessenger` /
  `RemoveStoredPaymentMessenger` / `CardMessenger` / `AddressLookupCallback` interfaces. A
  package-level bus is created in `AdyenPaymentPackage` and shared by `ContextModule`,
  `ComponentModule`, and `DropInModule`; each embedded view constructs its **own** per-view
  `MessageBus` in `AdyenComponentViewState.renderView`. Both bus objects emit through the same
  underlying channel.

No payment event payload carries presenter identity on either platform. Submit/details/complete
bodies contain only SDK payment data (for example Android `SubmitData` puts `paymentData` and
`extra`; iOS `sendSubmitEvent` emits the `SubmitData` json). The `viewId` exists only as a native
registry key.

## Embedded views

An embedded `<AdyenComponent>` renders a native Fabric view that reads the shared checkout state and
builds the SDK component directly. Each view registers under its React tag so teardown can find it:

- **iOS**: `ADYAdyenComponentView` derives `viewId` from `self.tag`, calls
  `ComponentModule.register(viewId:)` to obtain a `ComponentProxy`, and on `prepareForRecycle` calls
  `proxy.dispose()` which `unregister`s the view. `ComponentModule` keeps
  `delegates: [String: ComponentProxy]`.
- **Android**: `AdyenComponentViewState` registers the view in `ComponentModule` (`consumers:
MutableMap<String, ComponentContract>` keyed by reactTag) and registers its `ComponentManager` in
  `ContextModule`'s routing map. Unmount (`onDropViewInstance` → `dispose`) disposes the view's
  compose child, unregisters both registrations, and disposes that view's own `ComponentManager`.

Unmounting a view disposes only that view's native registration/controller; it does not tear down
the checkout. The mounting constraint (one view per payment-method type) is enforced in TypeScript —
see [js-architecture.md](./js-architecture.md#listener-ownership) and the presenter model in
[Architecture.md](./Architecture.md#presenter-model).

## Headless submit and presentation

- **Android**: `requiresUserInteraction(type)` builds and caches a controller via
  `resolveController(type)` (get-or-put into the manager map) and reports whether it needs UI;
  `submit(type)` reuses or creates that controller and presents an auto-submit `CheckoutFragment`
  as an action host, so a resulting action (redirect/3DS) has somewhere to render even with no
  `<AdyenComponent>` mounted. The fragment is hidden terminally. A shopper closing it maps to
  `ModuleException.Canceled()` plus `unregisterManager(type)` (which disposes the manager). Apple Pay
  is unavailable on Android; Google Pay runs a device availability check.
- **iOS**: `submit(type)` submits a cached payment component and presents action UI through the
  module's presentation delegate and the `presenterStack` only when the SDK requests it. Google Pay
  is unavailable on iOS; Apple Pay runs a PassKit availability check.

Full availability and capability status is in [FeatureSupport.md](./FeatureSupport.md).

## Standalone action

`AdyenAction.handle(action, configuration)` runs an action-only checkout with no `AdyenCheckout`
handle:

- **iOS** (`ios/CSE/ActionModule.swift`): sets up an `ActionOnlyCheckout` with
  `presentationDelegate: self` and calls `checkout.handle(action:)`; UI appears only if the SDK
  requests presentation. `onAdditionalDetails` resolves the JS promise with the details json;
  `onComplete` resolves with a result-code object; `onFailure` rejects. `hide(_:)` clears the promise
  blocks and dismisses.
- **Android** (`cse/ActionModule.kt`): sets up the checkout and presents a `CheckoutFragment`
  explicitly. `onAdditionalDetails` resolves the promise with the details and otherwise the flow
  rejects (no `onComplete` result-code resolution). `hide(success)` dismisses the fragment and
  releases the controller/promise.

On both platforms the `hide` boolean currently has no semantic effect — it is not read.

## Re-setup and failed replacement

Re-setup runs a native preamble that cancels in-flight work **without** tearing the context down,
and replaces shared state only on success:

- **iOS**: `setupAdvanced` (and the session path) call `cancelPendingOperations()` first — clearing
  cached components, cancelling the result sink, the before-submit bridge, and the Apple Pay bridges
  — but **not** `cleanUp()`, so `checkoutState` and the presenter stack are retained. A new
  `CheckoutState` is assigned only after `Checkout.setup(...)` succeeds; if it rejects, the previous
  `checkoutState` remains.
- **Android**: `setupSessionAsync`/`setupAdvancedAsync` first cancel the session before-submit
  bridge and dispose+clear the component managers, but do **not** clear the `ComponentModule`
  consumer registry and do **not** clear `checkoutState`. The new `CheckoutState` is assigned only
  after `Checkout.setup(...)` succeeds.

Because JS re-setup runs `clearJSState()` before validation and native assignment happens only on
success, a rejected replacement leaves observable mixed state that an old globally backed handle can
still consult or `invalidate()`. See [Architecture.md](./Architecture.md#setup-rejection-and-failed-replacement).

## Cleanup asymmetry and mounted-view survival

Native context cleanup is not a React view unmount and does not reconstruct views for a replacement
checkout:

- **iOS** `ContextModule` cleanup runs `cancelPendingOperations()` then `cleanUp()`, which sets
  `checkoutState = nil` and clears/dismisses the presenter stack. It does **not** call
  `ComponentModule.cleanUp()` and does not dispose the registered proxies, so mounted proxies survive
  context cleanup.
- **Android** `ContextModule.cleanup()` cancels the session before-submit bridge, disposes the
  registered component managers, clears the `componentManagers` map, calls
  `ComponentModule.clearConsumers()`, then clears `checkoutState`. Clearing the consumer map does not
  itself dispose the consumers, and the mounted `DynamicComponentView` is not disposed.

A `<AdyenComponent>` left mounted across a context cleanup or re-setup therefore becomes a
platform-specific stale view. View unmount/recycle cleanup is a separate path owned by the view
managers (`onDropViewInstance` on Android, `prepareForRecycle` on iOS).

## Drop-in

Drop-in support is intentionally uneven; the authority is [FeatureSupport.md](./FeatureSupport.md).
Architecturally:

- **iOS** `DropInModule.start(_:)` and `action(_:)` emit `ModuleException.notSupported` (routed to
  the session or advanced error name by `sendError`) rather than presenting.
- **Android session** Drop-in emits an explicit `"Drop-in session flow not yet supported in v6
alpha"` error, after the background task has already started.
- **Android advanced** Drop-in is legacy-backed: it converts to `com.adyen.checkout.dropin.old`
  types and launches through `dropin.old.DropIn.startPayment` with an `AdvancedCheckoutService`. Its
  compatibility configuration builder forwards only environment, client key, locale, and amount. The
  background task is finished only by the wrapper's `completion()`/`retry()`, not by the
  cancellation/error/final-result callbacks and not by generic context cleanup.
