# React Native SDK v6 — Public API (Implemented)

> This document reflects the final implemented API of the v6 alpha, not the original proposal.

## Static API Surface

```mermaid
classDiagram
    class AdyenCheckout {
        +setup(session, configuration, SessionCallbacks): Promise~Checkout~$
        +setupAdvanced(paymentMethods, configuration, AdvancedCallbacks): Promise~Checkout~$
    }

    class Checkout {
        +paymentMethods: PaymentMethodsResponse
        +configuration: Configuration
        +isAvailable(type: string): Promise~boolean~
        +requiresUserInteraction(type: string): Promise~boolean~
        +submit(type: string): void
        +invalidate(): void
    }

    class PaymentMethodsResponse {
        +regular: PaymentMethod[]
        +stored: StoredPaymentMethod[]
    }

    class SessionCallbacks {
        +onComplete(result): void
        +onError(error): void
        +onBeforeSubmit?(data): Promise~BeforeSubmitResult~
    }

    class AdvancedCallbacks {
        +onSubmit(data): Promise~SubmitResult~
        +onAdditionalDetails(data): Promise~AdditionalDetailsResult~
        +onComplete(result): void
        +onError(error): void
    }

    class SubmitResult {
        <<union type>>
        action | completed | retry
    }

    class AdditionalDetailsResult {
        +resultCode: string
    }

    class BeforeSubmitResult {
        <<union type>>
        proceed | abort
    }

    AdyenCheckout --> Checkout : returns from setup
    Checkout --> PaymentMethodsResponse : paymentMethods
    AdyenCheckout --> SessionCallbacks : setup()
    AdyenCheckout --> AdvancedCallbacks : setupAdvanced()
    AdvancedCallbacks --> SubmitResult : onSubmit returns
    AdvancedCallbacks --> AdditionalDetailsResult : onAdditionalDetails returns
    SessionCallbacks --> BeforeSubmitResult : onBeforeSubmit returns
```

## Components & Lifecycle

```mermaid
classDiagram
    class AdyenCheckout {
        +setup(session, config, callbacks): Promise~Checkout~$
        +setupAdvanced(paymentMethods, config, callbacks): Promise~Checkout~$
        Note: Static class, not a React component
    }

    class AdyenComponent {
        +checkout: Checkout
        +type: string
        Note: One per type, multiple types allowed
    }

    class AdyenDropIn {
        +start(checkout): void
        Note: Uses checkout object from setup
    }

    AdyenCheckout --> AdyenComponent : checkout object
    AdyenCheckout --> AdyenDropIn : checkout object
```

## Checkout Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> SettingUp: AdyenCheckout.setup() or setupAdvanced()
    SettingUp --> Ready: checkout object returned

    Ready --> Ready: checkout.isAvailable() / checkout.requiresUserInteraction() / checkout.submit()
    Ready --> Ready: AdyenDropIn.start(checkout)
    Ready --> Idle: AdyenCheckout.setup() called again (implicit cleanup)
    Ready --> Destroyed: terminal callback, or checkout.invalidate()
    Ready --> Destroyed: Terminal callback (onComplete / onError) triggers auto-cleanup

    state Ready {
        [*] --> NoComponents
        NoComponents --> HasComponents: AdyenComponent mounts
        HasComponents --> HasComponents: another type mounts
        HasComponents --> NoComponents: all unmounted
    }

    state Destroyed {
        [*] --> DisposeControllers
        DisposeControllers --> ClearContext
        ClearContext --> RemoveListeners
    }
```

**`<AdyenComponent>` mount/unmount behavior:**

| Event | What happens | checkoutState affected? |
|-------|-------------|--------------------------|
| `<AdyenComponent>` **mounts** | Builds its payment component from the shared checkout; registers natively so teardown can find it | No |
| `<AdyenComponent>` **unmounts** | Disposes its component | No |
| **Terminal callback** fires | Auto-cleanup: disposes every component, clears state, removes listeners | **Yes — full teardown** |
| `checkout.invalidate()` called | Same as above, for a flow the shopper abandoned | **Yes — full teardown** |

> **Lifecycle invariant:** `BaseModule.checkoutState` is managed by the `AdyenCheckout` static class.
> Terminal callbacks (`onComplete`, `onError`) trigger cleanup automatically, and
> `checkout.invalidate()` does the same for an abandoned flow. No checkout state survives cleanup.
>
> Calling `AdyenCheckout.setup()` or `setupAdvanced()` again clears the JS-side state; native
> replaces its own when it receives the new setup call.
>
> **`<AdyenComponent>` unmount** disposes only that view's payment component. It does not affect
> `checkoutState` or any other view — a view going away must not end the checkout, or a headless
> `submit()` afterwards would have no context to run in.

## Sessions Flow

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant AC as AdyenCheckout (static)
    participant Native as Native (ContextModule)
    participant SDK as Adyen SDK v6

    App->>AC: const checkout = await AdyenCheckout.setup(session, configuration, callbacks)
    AC->>Native: createSession(session, config)
    Native->>SDK: Checkout.setup(session, config)
    SDK-->>Native: SessionContext + paymentMethods
    Native-->>AC: paymentMethods
    Note over AC: checkout object returned

    App->>App: await checkout.isAvailable('googlepay')
    AC->>Native: check paymentMethods + device availability
    Native-->>AC: true / false

    alt Requires UI (card, issuer list, etc.)
        App->>App: await checkout.requiresUserInteraction('scheme')
        AC->>Native: pre-build controller, check requiresUserInteraction
        Native-->>AC: true
        App->>App: render <AdyenComponent checkout={checkout} type="scheme" />
        Note over App: Native view renders card form<br/>User fills in and taps Pay
        SDK-->>Native: Session handles /payments automatically
    else No UI (instant, stored card)
        App->>App: await checkout.requiresUserInteraction('klarna')
        Native-->>AC: false
        App->>App: checkout.submit('klarna')
        AC->>Native: controller.submit()
        SDK-->>Native: Session handles /payments automatically
    end

    alt Success
        SDK-->>Native: onComplete(result)
        Native-->>AC: SessionsResult
        AC-->>App: onComplete(result)
        Note over App: Auto-cleanup triggered
    else Error
        SDK-->>Native: onError(error)
        AC-->>App: onError(error)
        Note over App: Auto-cleanup triggered
    end
```

## Advanced Flow

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant AC as AdyenCheckout (static)
    participant View as <AdyenComponent>
    participant Native as Native (ContextModule + ComponentModule)
    participant SDK as Adyen SDK v6
    participant Server as Merchant Server

    App->>Server: /paymentMethods
    Server-->>App: paymentMethods

    App->>AC: const checkout = await AdyenCheckout.setupAdvanced(paymentMethods, configuration, callbacks)
    AC->>Native: setup(paymentMethods, config)
    Native->>SDK: Checkout.setup(paymentMethods, config)
    SDK-->>Native: CheckoutContext
    Note over AC: checkout object returned

    App->>App: await checkout.requiresUserInteraction('ideal')
    AC->>Native: pre-build controller
    Native-->>AC: true

    App->>View: render <AdyenComponent checkout={checkout} type="ideal" />
    Note over View: Native view renders issuer list<br/>User selects and taps Pay

    SDK-->>Native: onSubmit(paymentData)
    Native-->>AC: PaymentMethodData
    AC-->>App: onSubmit(data) → Promise<SubmitResult>

    App->>Server: /payments(data)
    Server-->>App: response

    alt Action required (3DS2, redirect)
        App-->>AC: return SubmitResult.action(response.action)
        AC->>Native: SubmitResult.Action(action)
        SDK-->>Native: Action UI
        SDK-->>Native: onAdditionalDetails(data)
        AC-->>App: onAdditionalDetails(data) → Promise<AdditionalDetailsResult>
        App->>Server: /payments/details(data)
        Server-->>App: finalResult
        App-->>AC: return { resultCode }
    else Final result
        App-->>AC: return SubmitResult.completed(resultCode)
    else Retry
        App-->>AC: return SubmitResult.retry('Payment failed')
        Note over View: UI stays open, shopper retries
    end
```

## Drop-In Flow

> **Drop-In** relies on the shared checkout context created by `AdyenCheckout.setup()` or
> `AdyenCheckout.setupAdvanced()`. It uses `BaseModule.checkoutContext` which is tied to
> the checkout object's lifecycle.

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant AC as AdyenCheckout (static)
    participant DropIn as AdyenDropIn
    participant Native as Native DropInModule
    participant SDK as Adyen SDK v6

    Note over App: After AdyenCheckout.setup() or setupAdvanced()

    App->>DropIn: AdyenDropIn.start(checkout)
    DropIn->>Native: open(checkout.paymentMethods)
    Native->>Native: Uses BaseModule.checkoutContext
    Native->>SDK: Present Drop-In UI

    Note over SDK: Drop-In handles payment method<br/>selection and component rendering

    alt Sessions
        SDK-->>Native: Session handles everything
        Native-->>AC: onComplete / onError via registered callbacks
    else Advanced
        SDK-->>Native: onSubmit / onAdditionalDetails
        Native-->>AC: delegates to registered callbacks
    end

    Note over App: Auto-cleanup on terminal callbacks;<br/>checkout.invalidate() for an abandoned flow
```

## `requiresUserInteraction` + Controller Pre-build

```mermaid
flowchart TD
    A["checkout = await AdyenCheckout.setup(...)"] --> B{"checkout.isAvailable('type')"}
    B -->|false| C[Don't show this payment method]
    B -->|true| D{"checkout.requiresUserInteraction('type')"}

    D -->|"Pre-builds CheckoutController<br/>on native side"| E{Result}

    E -->|true| F["Render &lt;AdyenComponent checkout={checkout} type='type' /&gt;<br/>Uses pre-built controller"]
    E -->|false| G["Call checkout.submit('type')<br/>Uses pre-built controller"]

    F --> H[User interacts with payment UI]
    H --> I[Native Pay button triggers submit]

    G --> J[Payment submitted without UI]

    style D fill:#f5a623,color:#fff
    style F fill:#7ed321,color:#fff
    style G fill:#4a90d9,color:#fff
```

## Multiple Components Example

```
Allowed — different types:

<AdyenComponent checkout={checkout} type="scheme" />      — Card form
<AdyenComponent checkout={checkout} type="applepay" />     — Apple Pay button
<AdyenComponent checkout={checkout} type="googlepay" />    — Google Pay button
<AdyenComponent checkout={checkout} type="ideal" />        — Issuer list

Not allowed — duplicate type:

<AdyenComponent checkout={checkout} type="scheme" />
<AdyenComponent checkout={checkout} type="scheme" />       — Error: duplicate
```

## Native Module Architecture

```
Native modules:
├── ContextModule (AdyenCheckout)        — lifecycle, callbacks, events, headless APIs
│   ├─ createSession(session, config)        (session flow setup)
│   ├─ setup(paymentMethods, config)         (advanced flow setup)
│   ├─ cleanup()
│   ├─ isAvailable(type)
│   ├─ requiresUserInteraction(type)
│   ├─ submit(type)
│   ├─ action(action) / completion(resultCode) / retry(message)
│   ├─ the only emitter — every event reaches JS through this module
│   └─ componentManagers: Map<type, ComponentManager>   (Android)
│
├── ComponentModule (AdyenComponent)     — registry of mounted views, native-only
│   └─ register(viewId) / unregister(viewId), disposed on cleanup
│
├── DropInModule (AdyenDropIn)           — modal Drop-In
│   ├─ open(paymentMethods) → uses BaseModule.checkoutContext
│   ├─ action / completion / retry
│   └─ getReturnURL()
│
├── AdyenAction                          — standalone action handling (kept)
└── AdyenCSE                             — encryption/validation (kept)
```

## Module Simplification

```
Before (v5):
├── AdyenDropIn          (open, action, completion, retry)
├── AdyenGooglePay       (isAvailable)                    — standalone module
├── AdyenApplePay        (isAvailable, provide* callbacks) — standalone module
├── AdyenInstant         (open, action, completion, retry) — standalone module
├── AdyenAction          (handle, hide)                    — standalone
├── AdyenCSE             (encrypt, validate)               — standalone
├── CardView             (native view, card only)
├── ApplePayButton       (native view)
├── GooglePayButton      (native view)
├── SetupModule          (createSession, setup)
├── EmbeddedComponentBusModule  (viewId routing)

After (v6 — implemented):
├── AdyenCheckout        (static class: setup, setupAdvanced)
│   └── Checkout         (paymentMethods, configuration, isAvailable, requiresUserInteraction, submit, invalidate)
├── <AdyenComponent>     (checkout, type — generic native view for ANY payment method)
├── AdyenDropIn          (start(checkout))
├── AdyenAction          (handle, hide — standalone escape hatch)
├── AdyenCSE             (encrypt, validate)
│
│ Native modules (internal):
├── ContextModule        (createSession, setup, cleanup, isAvailable, requiresUserInteraction, submit,
│                         action, completion, retry — and the only event emitter)
├── ComponentModule      (register / unregister — native-only registry, for teardown)
├── DropInModule         (open, action, completion, retry)
├── ActionModule         (action, hide)
└── AdyenCSEModule       (encrypt, validate)
```
