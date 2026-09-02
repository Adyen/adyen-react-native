# Native Architecture

Diagrams of the iOS and Android bridges. For the TypeScript side see
[js-architecture.md](./js-architecture.md); for prose on the lifecycle contract see
[Architecture.md](./Architecture.md).

## The shape both platforms share

```mermaid
flowchart TB
  JS(["JavaScript"])

  subgraph N["Native module layer"]
    CTX["ContextModule<br/><i>AdyenContext</i><br/>owns setup + CheckoutState"]
    DIM["DropInModule<br/><i>AdyenDropIn</i>"]
    CPM["ComponentModule<br/><i>AdyenComponent</i><br/>view bus"]
    ACT["ActionModule<br/><i>AdyenAction</i><br/>standalone, promise-based"]
  end

  subgraph P["Presenters — own suspended continuations"]
    HP["headless<br/><i>per payment method type</i>"]
    VP["one per embedded view"]
  end

  SDK["v6 native SDK<br/>SessionCheckout / AdvancedCheckout"]

  JS <-->|"@ReactMethod / @objc + events"| N
  CTX --> HP
  CPM --> VP
  HP & VP & DIM <-->|"closures + continuations"| SDK
```

`ContextModule` is the lifecycle owner on both platforms: it performs `setup()` / `createSession()`
and holds the static `CheckoutState`. Drop-in and embedded views read that shared state rather than
creating their own checkout.

## iOS class hierarchy

```mermaid
classDiagram
  class RCTEventEmitter
  class BaseModule {
    <<abstract-ish>>
    +checkoutState$ CheckoutState?
    +presenterStack$ UIViewController[]
    +completion(resultCode)
    +retry(message)
    +present(component)
    +cleanUp()
  }
  class BaseModuleSender {
    +checkout: BaseCheckout?
    +resultSink: AdvancedResultSink
    +sendSubmitEvent() / sendCompleteEvent()
    +setupCallbacks(on:)
  }
  class BaseActionModule {
    +action(_:)
    +setupActionCallbacks()
  }
  class BaseAddressModule {
    +update(results)
    +confirm(success, address)
  }
  class ContextModule {
    <<AdyenContext>>
    +shared$ ContextModule?
    +resultSink: AdvancedResultSink
    +createSession() / setup()
    +isAvailable() / requiresUserInteraction() / submit()
    +reattachAdvancedCallbacks()
  }
  class DropInModule {
    <<AdyenDropIn>>
    +open(paymentMethods)
  }
  class ComponentModule {
    <<AdyenComponent>>
    +delegates: [String: ComponentProxy]
    +subscribe() / register()
  }
  class ActionModule {
    <<AdyenAction>>
    +action(_:) Promise
  }

  RCTEventEmitter <|-- BaseModule
  BaseModule <|-- ContextModule
  BaseModule <|-- ActionModule
  BaseModule <|-- BaseModuleSender
  BaseModuleSender <|-- BaseActionModule
  BaseActionModule <|-- BaseAddressModule
  BaseAddressModule <|-- DropInModule
  BaseAddressModule <|-- ComponentModule
```

> [!IMPORTANT]
> `ContextModule` extends `BaseModule` **directly**, not the sender ladder. It cannot inherit
> `BaseModuleSender`, because that class declares its own continuations which would collide with
> the ones `ContextModule` must own. That collision is why the continuations were extracted into
> `AdvancedResultSink` and are now *composed* rather than inherited.

## `AdvancedResultSink`

The v6 SDK drives the advanced flow with `async` closures: `onSubmit` and `onAdditionalDetails`
suspend until the merchant answers through JS. Each presenter needs its own pair, so a result
resumes the presenter that opened the request.

```mermaid
classDiagram
  class AdvancedResultSink {
    -submitContinuation
    -additionalDetailsContinuation
    +isAwaitingSubmit: Bool
    +isAwaitingAdditionalDetails: Bool
    +isAwaitingResult: Bool
    +awaitSubmit() async
    +awaitAdditionalDetails() async
    +resolveSubmit(result)
    +resolveAdditionalDetails(result)
    +cancelPending()
  }

  ContextModule *-- AdvancedResultSink
  ComponentProxy *-- AdvancedResultSink
  BaseModuleSender *-- AdvancedResultSink

  note for AdvancedResultSink "composed by all three.\nresolve* no-ops when nothing is pending,\nso a late or duplicate result from JS\ncannot double-resume."
```

`cancelPending()` settles anything still suspended with the SDK's error result, so a torn-down
flow ends terminally instead of looking like a shopper-initiated retry.

## Callback ownership on iOS

The advanced closures live on the **one** shared `AdvancedCheckout`, so whoever wires them last
owns emission. There is room for exactly one owner at a time — which is why presenters are
sequential rather than parallel.

```mermaid
sequenceDiagram
  participant JS
  participant CM as ComponentModule
  participant CP as ComponentProxy
  participant CTX as ContextModule
  participant SDK as AdvancedCheckout

  Note over CTX,SDK: setup() — ContextModule wires the closures
  CTX->>SDK: onSubmit / onAdditionalDetails

  JS->>CM: subscribe(viewId)
  CM->>CP: create proxy
  CP->>SDK: re-points onSubmit at itself
  Note over CP,SDK: the view is now the owner

  JS->>CM: unsubscribe(viewId)
  CM->>CP: dispose()
  CP->>CP: resultSink.cancelPending()
  CM->>CTX: reattachAdvancedCallbacks()
  CTX->>SDK: onSubmit / onAdditionalDetails
  Note over CTX,SDK: ownership handed back —<br/>a later headless submit() would otherwise<br/>suspend on a disposed proxy
```

> [!NOTE]
> Unsubscribing the last view does **not** tear the checkout down. Teardown belongs to a terminal
> event or `invalidate()`. Doing it on unmount used to nil `checkoutState`, which broke a headless
> `submit()` afterwards and left JS believing the checkout was still active.

## Android class hierarchy

```mermaid
classDiagram
  class ReactContextBaseJavaModule
  class AppCompatModule {
    <<abstract>>
    +appCompatActivity
  }
  class BaseModule {
    <<abstract>>
    +checkoutState$ CheckoutState?
    +messageBus: MessageBus
    +supportedEvents()
    +cleanup()
  }
  class BaseActionModule {
    <<abstract>>
    +parseActionFromMap()
    +coreEvents()
  }
  class BaseAddressModule {
    <<abstract>>
    +parseAddressOptions()
    +parseLookupAddress()
  }
  class ContextModule {
    <<AdyenContext>>
    +componentManagers: Map
    +createSession() / setup()
    +action() / completion() / retry()
    -awaitingManager()
  }
  class ComponentModule {
    <<AdyenComponent>>
    +consumers: Map
    +subscribe() / register()
  }
  class DropInModule {
    <<AdyenDropIn>>
    +open(paymentMethods)
  }
  class ActionModule {
    <<AdyenAction>>
    +action() Promise
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

> [!NOTE]
> The two platforms differ here on purpose. On Android `ContextModule` and `ComponentModule` both
> extend `BaseActionModule`; on iOS `ContextModule` extends `BaseModule` and `ComponentModule`
> extends `BaseAddressModule`. Each ladder reflects what that platform's module actually needs.

## Android messaging

```mermaid
classDiagram
  class Emitter {
    <<interface>>
    +sendEvent(name, JSONObject)
    +sendEvent(name, String)
    +sendEvent(name, JSONArray)
  }
  class TaggedEmitter {
    <<private constructor>>
    +forView(emitter, viewId)$
    +forSource(emitter, source)$
  }
  class MessageBus {
    <<by delegation>>
    SessionMessenger
    AdvancedMessenger
    PartialPaymentMessenger
    RemoveStoredPaymentMessenger
    CardMessenger
    AddressLookupCallback
  }

  Emitter <|.. TaggedEmitter
  TaggedEmitter --> Emitter : wraps
  MessageBus --> Emitter : emits through
```

`MessageBus` is composition by Kotlin delegation rather than a god object: each concern is a small
`*Messenger` interface with its own `*MessengerImpl`, and the bus simply delegates.

### Why the two factories treat scalars differently

`TaggedEmitter` has three `sendEvent` overloads, and the factories diverge on the scalar ones:

| | `String` payload | `JSONArray` payload |
| --- | --- | --- |
| `forView` | boxed as `{viewId, value}` | boxed as `{viewId, data}` |
| `forSource` | passed through, untagged | passed through, untagged |

The asymmetry is what makes the Drop-in bus taggable at all. `onBinValue` and address lookup emit
scalars that JS reads directly; boxing them for a source tag would silently reshape those
payloads. Neither carries a result that needs routing, so leaving them untagged costs nothing.

## Presenter equivalence

The same three responsibilities, named differently per platform:

| | Android `ComponentManager` | iOS `ComponentProxy` |
| --- | --- | --- |
| Suspended continuations | `submitContinuation`, `additionalDetailsContinuation` | `AdvancedResultSink` |
| "Is a result pending?" | `isAwaitingResult` | `resultSink.isAwaitingResult` |
| Identity-tagged emitter | injected `MessageBus` | `taggedBody()` via `ComponentModule` |
| Extra callback wiring | `additionalCallbacks: CheckoutCallbacks.() -> Unit` | closures on the shared checkout |

## Headless submit on Android

`ContextModule` keeps one `ComponentManager` per payment method type and routes a JS result to
whichever one is actually waiting — only one payment can be mid-flight.

```mermaid
sequenceDiagram
  participant JS
  participant CTX as ContextModule
  participant CMG as ComponentManager
  participant SDK as AdvancedCheckout

  JS->>CTX: submit("scheme")
  CTX->>CMG: get/create for type
  CMG->>SDK: submit()
  SDK->>CMG: onSubmit(data) — suspends
  CMG->>JS: emit(submit, data + source:"context")

  JS->>CTX: action(actionMap)
  CTX->>CTX: awaitingManager() — isAwaitingResult
  CTX->>CMG: resume with Action
  CMG-->>SDK: resume continuation
  SDK->>CMG: onComplete(result)
  CMG->>JS: emit(complete)
```

> [!NOTE]
> `completion()` falls back to `cleanup()` **only** when nothing is pending. That fallback is what
> the session flow relies on, so it cannot simply be replaced by resuming the continuation.

## Event identity summary

| Presenter | Tag | Android | iOS |
| --- | --- | --- | --- |
| Embedded view | `viewId` | `TaggedEmitter.forView` | `ComponentProxy.taggedBody()` |
| Headless / context | `source: "context"` | context-tagged `MessageBus` | `ContextModule.taggedBody()` |
| Drop-in | `source: "dropin"` | Drop-in-tagged `MessageBus` | untagged while Drop-in is unsupported |

Keep `EventSource` on both platforms and the presenter ids in `src/checkout/constants.ts` in sync.

> [!NOTE]
> v6 has **no Drop-in yet** on either platform: Android has only `com.adyen.checkout.dropin.old`,
> and iOS `AdyenDropIn` reports `notSupported`. When the v6 Drop-in lands it is expected to reuse
> the same `CheckoutConfiguration` and callbacks, so it should slot in as another presenter rather
> than a new subsystem.
