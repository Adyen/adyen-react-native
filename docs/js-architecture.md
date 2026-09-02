# JS Architecture

Diagrams of the TypeScript layer. For the iOS and Android sides see
[native-architecture.md](./native-architecture.md); for prose on the lifecycle contract see
[Architecture.md](./Architecture.md).

## Module layout

Four top-level folders, with dependencies pointing one way only.

```mermaid
flowchart TD
  subgraph pub["src/index.ts — public barrel"]
    direction LR
    B1["export * from './checkout'"]
    B2["'./components'"]
    B3["'./core'"]
    B4["'./modules'"]
  end

  CO["core/<br/><i>vocabulary</i><br/>types · constants · configurations<br/><b>pure leaf</b>"]
  CH["checkout/<br/><i>machinery</i><br/>lifecycle · routing · validation"]
  CM["components/<br/><i>React layer</i><br/>AdyenComponent.tsx"]
  MO["modules/<br/><i>native wrappers</i><br/>AdyenContext · AdyenDropIn · AdyenAction · AdyenCSE"]

  pub --> CH & CM & CO & MO
  CH --> CO
  CH --> MO
  CM --> CO
  CM -.->|"AdyenComponent only"| MO
  MO --> CO
```

`core` imports nothing from the other three, so the vocabulary can never depend on machinery.
`checkout` is the only folder that reaches into both `core` and `modules`.

> [!NOTE]
> `core/types.ts` is a **publication mechanism**, not a shared types bucket: `core/index.ts` does
> `export * from './types'` and `src/index.ts` does `export * from './core'`, so anything added
> there becomes public API. Internal shapes belong beside their consumer — which is why
> `EventTags`, `CheckoutRuntime` and `CheckoutHost` live in `checkout/types.ts`.

## `src/checkout/`

```mermaid
classDiagram
  class AdyenCheckout {
    <<static>>
    -runtime: CheckoutRuntime
    +setup(session, config, callbacks) Promise~Checkout~
    +setupAdvanced(paymentMethods, config, callbacks) Promise~Checkout~
    -wireEventHandlerRefs(handlers)
    -subscribeDropInHandlers()
    -subscribe(viewId)
    -unsubscribe(viewId)
    -resetState(cleanupNativeContext)
  }

  class CheckoutRuntime {
    <<interface>>
    +configuration: Configuration
    +sessionCallbacks: SessionCallbacks
    +advancedCallbacks: AdvancedCallbacks
    +subscriptions: Map~string, EmitterSubscription[]~
    +isCleanedUp: boolean
    +hasHandledTerminalEvent: boolean
    +eventHandlerRefs: EventHandlerRefs
  }

  class Checkout {
    <<interface, public>>
    +paymentMethods
    +configuration
    +isAvailable(type)
    +requiresUserInteraction(type)
    +submit(type)
    +invalidate()
  }

  class CheckoutHost {
    <<interface>>
    +isActive() boolean
    +subscribe(viewId)
    +unsubscribe(viewId)
    +invalidate()
  }

  class presenters {
    <<module>>
    +viewKey(viewId) string
    +viewIdOf(key) string?
    +stripTag(raw) T
    +resolveTarget(raw) AdvancedPayment
    +dispatchSubmitResult(result, target)
  }

  AdyenCheckout *-- CheckoutRuntime
  AdyenCheckout ..> presenters : routes with
  AdyenCheckout ..> Checkout : creates via createCheckout()
  Checkout --> CheckoutHost : delegates lifecycle
  CheckoutHost <|.. AdyenCheckout : implements
```

Two lifetimes worth separating:

| | `Checkout` | `AdyenCheckout` |
| --- | --- | --- |
| Scope | one per `setup()` | process-wide singleton |
| Lifetime | until a terminal event or `invalidate()` | outlives every handle |
| Visibility | public interface | public class, private state |

Once its owner is torn down, every handle method except `unsubscribe` becomes an ignored no-op
that warns — `unsubscribe` is never guarded because views detach *while* tearing down, after
cleanup has already run.

## Native module wrappers

Two things are going on: a small **inheritance** ladder for event plumbing, and an **interface**
that is what routing actually depends on. The interface is the important one.

```mermaid
classDiagram
  class AdvancedPayment {
    <<interface>>
    +action(action)
    +completion(resultCode)
    +retry(message)
  }
  class AdyenContextModule {
    <<interface>>
    +setup() / createSession()
    +isAvailable() / requiresUserInteraction() / submit()
  }
  class DropInModule {
    <<interface>>
    +start(checkout)
    +getReturnURL()
  }

  class EventListenerWrapper~T~ {
    <<abstract>>
    #nativeModule: T
    #supportedEvents: string[]
    +isSupported(event) boolean
    +eventEmitterTarget
  }
  class ContextModuleWrapper {
    -eventEmitter: NativeEventEmitter
    -subscriptions: Map
    +assignSubmitHandler() etc.
  }
  class DropInWrapper {
    +removeStored() / provideBalance() / provideOrder()
    +update() / confirm()
  }
  class ComponentModuleWrapper {
    +subscribe(viewId) / unsubscribe(viewId)
  }

  AdvancedPayment <|-- AdyenContextModule
  AdvancedPayment <|-- DropInModule
  AdyenContextModule <|.. ContextModuleWrapper
  DropInModule <|.. DropInWrapper

  EventListenerWrapper <|-- DropInWrapper
  EventListenerWrapper <|-- ComponentModuleWrapper

  note for AdvancedPayment "the shared contract.\nresolveTarget() returns this, so\ndispatchSubmitResult() can send a result\nto Drop-in or the context flow\nwithout knowing which."
```

**There is deliberately no shared base *class* between Drop-in and the context flow.** They share
the `AdvancedPayment` interface, and the only duplicated implementation is three one-line
delegations to the native module. Their event models genuinely differ:

| | `ContextModuleWrapper` | `DropInWrapper` |
| --- | --- | --- |
| Emitter | owns its own `NativeEventEmitter` | none — exposes `eventEmitterTarget` |
| Subscriptions | private map, one listener per event, replaced on re-setup | built externally by `startEventListeners` |
| Consumer API | `assign*Handler(cb)` | `isSupported(event)` |

A common base would have to bridge those two models, or exist purely to hold nine lines of
delegation — which is what the former `ModuleWrapper` did, and why it was removed.

> [!NOTE]
> `ContextModuleWrapper` — the busiest module — is outside the ladder and subscribes
> unconditionally, so the `isSupported` gate only affects the Drop-in and embedded-view paths.
> `ActionModuleWrapper` and `AdyenCSEWrapper` are standalone too: promise-based, no events.
> `ComponentProxy` composes `ComponentModuleWrapper` and scopes every call to one `viewId`.

## Presenter attribution

Every payment event is produced by one of three presenters. They all emit the **same event
names**, because delivery is global through `RCTDeviceEventEmitter` on both platforms — a
per-module emitter does not isolate delivery, it only does listener bookkeeping. Identity
therefore travels inside the payload.

```mermaid
flowchart LR
  DI["Drop-in<br/><code>source: 'dropin'</code>"]
  HL["Headless / context<br/><code>source: 'context'</code>"]
  EV["Embedded view<br/><code>viewId: reactTag</code>"]

  EM(["one global event channel"])
  DI & HL & EV --> EM

  EM --> F{"viewId present?"}
  F -->|yes| VL["that view's listener"]
  F -->|no| S{"source"}
  S -->|"'context'"| AC["AdyenContext"]
  S -->|"else / absent"| AD["AdyenDropIn"]
```

**The rule**, applied identically in `ContextModuleWrapper.subscribe` and `startEventListeners`:

- a listener bound to a view accepts only payloads with that same `viewId`;
- a listener *not* bound to a view accepts only payloads with **no** `viewId`.

Both halves matter. Without the second, an embedded view's events also reach the context
listeners and the merchant `onSubmit` runs twice for one payment.

> [!IMPORTANT]
> The tag is stripped before any merchant callback. This is correctness, not tidiness: the
> additional-details payload *is* the request body posted to `/payments/details`, so a stray
> `source` field would be sent to the API.

> [!NOTE]
> `onBeforeSubmit` is deliberately **never** `viewId`-tagged — the session bridge is
> context-owned and emits untagged even for embedded views. If that changed, the filter above
> would swallow it and the session flow would deadlock on a suspended continuation. Enforced
> only by tests.

## Advanced flow round trip

The loop must close on the presenter that opened it, because each one suspends its own
continuation natively.

```mermaid
sequenceDiagram
  participant M as Merchant app
  participant AC as AdyenCheckout
  participant CW as ContextModuleWrapper
  participant N as Native presenter
  participant SDK as v6 Checkout

  M->>AC: setupAdvanced(paymentMethods, config, callbacks)
  AC->>AC: checkConfiguration + checkPaymentMethodsResponse
  AC->>CW: assign*Handler(...)
  AC->>N: setup()
  AC-->>M: Checkout

  Note over N,SDK: shopper pays
  SDK->>N: onSubmit(data) — suspends
  N->>CW: emit(submit, data + tag)
  CW->>AC: didSubmit
  AC->>AC: resolveTarget(payload)
  AC->>M: onSubmit(paymentData)
  M-->>AC: SubmitResult
  AC->>N: action / completion / retry
  N-->>SDK: resume continuation
  SDK->>N: onComplete(result)
  N->>AC: complete
  AC->>M: onComplete(result)
  AC->>AC: auto-cleanup
```

## Listener families

`startEventListeners` groups events so a caller subscribes only what it owns.

```mermaid
flowchart TD
  SE["startEventListeners(component, refs, viewId, families)"]
  C["core<br/>submit · additionalDetails · complete · error"]
  CD["card<br/>BIN lookup / value"]
  AL["addressLookup<br/>update · confirm"]
  DI["dropIn<br/>stored-payment removal · partial payments"]
  AP["applePay<br/>authorize · shipping · coupon"]

  SE --> C & CD & AL & DI & AP

  V["Embedded view<br/><i>startEventListeners(proxy, refs, viewId)</i>"] -->|all families| SE
  D["Drop-in<br/><i>startDropInEventListeners(module, refs)</i>"] -->|"card + addressLookup + dropIn"| SE
```

`core` is excluded from the Drop-in entry point on purpose: those events arrive on the context
listeners and are routed by tag, so subscribing them in both places would invoke merchant
callbacks twice.

> [!NOTE]
> Before families existed, `startEventListeners` was only ever called per `viewId`, so
> stored-payment removal, partial payments and address lookup had **no listener at all** unless
> an embedded view was mounted — the matching Drop-in configuration callbacks never fired.

## Subscription bookkeeping

One map, keyed by presenter, so Drop-in and every view are torn down by the same loop.

```mermaid
flowchart LR
  subgraph M["runtime.subscriptions"]
    K1["'view:42' → EmitterSubscription[]"]
    K2["'view:57' → EmitterSubscription[]"]
    K3["'dropin' → EmitterSubscription[]"]
  end

  R["resetState()"] --> M
  M --> Q{"viewIdOf(key)"}
  Q -->|"'42'"| NU["remove listeners<br/>+ AdyenComponent.unsubscribe(42)"]
  Q -->|undefined| JU["remove listeners only"]
```

The `view:` prefix is what teardown needs: only a view has a native subscription to detach. A
bare `dropin` key in the same namespace would have made teardown call
`AdyenComponent.unsubscribe('dropin')`.
