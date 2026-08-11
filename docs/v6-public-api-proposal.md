# React Native SDK v6 — Public API Proposal

## Hook API Surface

```mermaid
classDiagram
    class useAdyenCheckout {
        +setup(sessionID, sessionData, SessionCallbacks): Promise~Checkout~
        +setupAdvanced(paymentMethods, AdvancedCallbacks): Promise~Checkout~
        +checkout: Checkout | null
    }

    class Checkout {
        +paymentMethods: PaymentMethodsResponse
        +isAvailable(type: string): Promise~boolean~
        +requiresUserInteraction(type: string): Promise~boolean~
        +submit(type: string): void
    }

    class PaymentMethodsResponse {
        +regular: PaymentMethod[]
        +stored: StoredPaymentMethod[]
    }

    class SessionCallbacks {
        +onComplete(result, component: PaymentResultHandler)
        +onError(error, component: PaymentResultHandler)
    }

    class AdvancedCallbacks {
        +onSubmit(data, component: PaymentSubmitResultHandler)
        +onAdditionalDetails(data, component: PaymentAdditionalResultHandler)
        +onError(error, component: PaymentResultHandler)
    }

    class PaymentSubmitResultHandler {
        +action(action): void
        +completion(resultCode): void
        +retry(message?): void
    }

    class PaymentAdditionalResultHandler {
        +completion(resultCode): void
    }

    class PaymentResultHandler {
        +completion(resultCode): void
    }

    useAdyenCheckout --> Checkout : checkout
    Checkout --> PaymentMethodsResponse : paymentMethods
    useAdyenCheckout --> SessionCallbacks : setup()
    useAdyenCheckout --> AdvancedCallbacks : setupAdvanced()
    AdvancedCallbacks --> PaymentSubmitResultHandler : onSubmit component
    AdvancedCallbacks --> PaymentAdditionalResultHandler : onAdditionalDetails component
    SessionCallbacks --> PaymentResultHandler : callback component
    AdvancedCallbacks --> PaymentResultHandler : onError component
```

## Components & Lifecycle

```mermaid
classDiagram
    class AdyenCheckout {
        +configuration: Configuration
        +children: ReactNode
        Note: Owns the checkout context lifecycle
    }

    class AdyenComponent {
        +checkout: Checkout
        +type: string
        Note: One per type, multiple types allowed
    }

    class AdyenDropIn {
        +start(): void
        Note: Must be used inside AdyenCheckout
    }

    AdyenCheckout --> AdyenComponent : provides context
    AdyenCheckout --> AdyenDropIn : provides context
    AdyenCheckout --> useAdyenCheckout : provides hook
```

## Context Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Idle: AdyenCheckout mounts
    Idle --> SettingUp: setup() or setupAdvanced()
    SettingUp --> Ready: checkout !== null

    Ready --> Ready: checkout.isAvailable() / checkout.requiresUserInteraction() / checkout.submit()
    Ready --> Ready: AdyenDropIn.start()
    Ready --> Idle: setup() called again (implicit cleanup)
    Ready --> Destroyed: AdyenCheckout unmounts

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

| Event | What happens | checkoutContext affected? |
|-------|-------------|--------------------------|
| `<AdyenComponent>` **mounts** | Attaches event listeners, uses pre-built controller | No |
| `<AdyenComponent>` **unmounts** | Removes its listeners, disposes its controller | No |
| `<AdyenCheckout>` **unmounts** | Disposes ALL controllers, clears context, removes all listeners | **Yes — full teardown** |

> **Lifecycle invariant:** `BaseModule.checkoutContext` is owned by the `<AdyenCheckout>` provider.
> When the provider unmounts, native cleanup (`ContextModule.cleanup()`) tears down all controllers,
> clears the checkout context, and removes listeners. No checkout state survives the provider.
>
> Calling `setup()` or `setupAdvanced()` again implicitly cleans up the previous context first.
> `ContextModule.cleanup()` is internal; not exposed on the public hook API.
>
> **`<AdyenComponent>` unmount** only removes that component's event listeners and disposes its
> controller. It does NOT affect `BaseModule.checkoutContext` or other components.

## Sessions Flow

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant AC as <AdyenCheckout>
    participant Hook as useAdyenCheckout
    participant Native as Native (ContextModule)
    participant SDK as Adyen SDK v6

    App->>AC: <AdyenCheckout configuration={...}>
    App->>Hook: const { setup, checkout } = useAdyenCheckout()

    App->>Hook: const checkout = await setup(sessionID, sessionData, { onComplete, onError })
    Hook->>Native: setup(id, data, config)
    Native->>SDK: Checkout.setup(session, config)
    SDK-->>Native: SessionContext + paymentMethods
    Native-->>Hook: paymentMethods
    Note over Hook: checkout is now available

    App->>App: await checkout.isAvailable('googlepay')
    Hook->>Native: check paymentMethods + device availability
    Native-->>Hook: true / false

    alt Requires UI (card, issuer list, etc.)
        App->>App: await checkout.requiresUserInteraction('scheme')
        Hook->>Native: pre-build controller, check requiresUserInteraction
        Native-->>Hook: true
        App->>AC: render <AdyenComponent checkout={checkout} type="scheme" />
        Note over AC: Native view renders card form<br/>User fills in and taps Pay
        SDK-->>Native: Session handles /payments automatically
    else No UI (instant, stored card)
        App->>App: await checkout.requiresUserInteraction('klarna')
        Native-->>Hook: false
        App->>App: checkout.submit('klarna')
        Hook->>Native: controller.submit()
        SDK-->>Native: Session handles /payments automatically
    end

    alt Success
        SDK-->>Native: onComplete(result)
        Native-->>Hook: SessionsResult
        Hook-->>App: onComplete(result, component)
        App->>App: component.completion(resultCode)
    else Error
        SDK-->>Native: onError(error)
        Hook-->>App: onError(error, component)
    end
```

## Advanced Flow

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant Hook as useAdyenCheckout
    participant View as <AdyenComponent>
    participant Native as Native (ContextModule + ComponentModule)
    participant SDK as Adyen SDK v6
    participant Server as Merchant Server

    App->>Server: /paymentMethods
    Server-->>App: paymentMethods

    App->>Hook: const checkout = await setupAdvanced(paymentMethods, { onSubmit, onAdditionalDetails, onError })
    Hook->>Native: setupAdvanced(paymentMethods, config)
    Native->>SDK: Checkout.setup(paymentMethods, config)
    SDK-->>Native: CheckoutContext
    Note over Hook: checkout is now available

    App->>App: await checkout.requiresUserInteraction('ideal')
    Hook->>Native: pre-build controller
    Native-->>Hook: true

    App->>View: render <AdyenComponent checkout={checkout} type="ideal" />
    Note over View: Native view renders issuer list<br/>User selects and taps Pay

    SDK-->>Native: onSubmit(paymentData)
    Native-->>Hook: PaymentMethodData
    Hook-->>App: onSubmit(data, component: PaymentSubmitResultHandler)

    App->>Server: /payments(data)
    Server-->>App: response

    alt Action required (3DS2, redirect)
        App->>App: component.action(response.action)
        Native->>SDK: SubmitResult.Action(action)
        SDK-->>Native: Action UI
        SDK-->>Native: onAdditionalDetails(data)
        Hook-->>App: onAdditionalDetails(data, component: PaymentAdditionalResultHandler)
        App->>Server: /payments/details(data)
        Server-->>App: finalResult
        App->>App: component.completion(resultCode)
    else Final result
        App->>App: component.completion(resultCode)
    else Retry
        App->>App: component.retry('Payment failed')
        Note over View: UI stays open, shopper retries
    end
```

## Drop-In Flow

> **Drop-In must be used inside `<AdyenCheckout>`** and relies on the shared checkout context
> created by `setup()` or `setupAdvanced()`. It uses `BaseModule.checkoutContext` which is
> tied to the `<AdyenCheckout>` lifecycle.

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant Hook as useAdyenCheckout
    participant DropIn as AdyenDropIn
    participant Native as Native DropInModule
    participant SDK as Adyen SDK v6

    Note over App: Inside <AdyenCheckout>, after setup() or setupAdvanced()

    App->>DropIn: AdyenDropIn.start()
    DropIn->>Native: open(paymentMethods, config)
    Native->>Native: Uses BaseModule.checkoutContext
    Native->>SDK: Present Drop-In UI

    Note over SDK: Drop-In handles payment method<br/>selection and component rendering

    alt Sessions
        SDK-->>Native: Session handles everything
        Native-->>Hook: onComplete / onError via registered callbacks
    else Advanced
        SDK-->>Native: onSubmit / onAdditionalDetails
        Native-->>Hook: delegates to registered callbacks
    end

    Note over App: When <AdyenCheckout> unmounts:<br/>controllers disposed, context cleared,<br/>listeners removed
```

## `requiresUserInteraction` + Controller Pre-build

```mermaid
flowchart TD
    A["checkout = await setup(...)"] --> B{"checkout.isAvailable('type')"}
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
✅ Allowed — different types:

<AdyenCheckout configuration={config}>
  <AdyenComponent checkout={checkout} type="scheme" />      ← Card form
  <AdyenComponent checkout={checkout} type="applepay" />     ← Apple Pay button
  <AdyenComponent checkout={checkout} type="googlepay" />    ← Google Pay button
  <AdyenComponent checkout={checkout} type="ideal" />        ← Issuer list
</AdyenCheckout>

❌ Not allowed — duplicate type:

<AdyenCheckout configuration={config}>
  <AdyenComponent checkout={checkout} type="scheme" />
  <AdyenComponent checkout={checkout} type="scheme" />       ← Error: duplicate
</AdyenCheckout>
```

## Native Module Architecture

```
Native modules (renamed):
├── ContextModule (AdyenContext)         — lifecycle, controllers, headless APIs
│   ├─ setup(sessionID, sessionData, config)
│   ├─ setupAdvanced(paymentMethods, config)
│   ├─ cleanup()
│   ├─ isAvailable(type)
│   ├─ requiresUserInteraction(type)
│   ├─ submit(type)
│   └─ controllers: Map<type, CheckoutController>
│
├── ComponentModule (AdyenComponent)     — view event bus (renamed from EmbeddedComponentBusModule)
│   ├─ subscribe(viewId) / unsubscribe(viewId)
│   └─ action(viewId) / completion(viewId) / retry(viewId)
│
├── DropInModule (AdyenDropIn)           — modal Drop-In
│   └─ start() → uses BaseModule.checkoutContext
│
├── AdyenAction                          — standalone action handling (kept)
└── AdyenCSE                             — encryption/validation (kept)
```

## Module Simplification

```
Before (v5/current v6 alpha):
├── AdyenDropIn          (open, action, completion, retry)
├── AdyenComponent       (forPaymentMethod, open, action, completion, retry)  ← ELIMINATED
├── AdyenGooglePay       (isAvailable)                    ← REMOVED
├── AdyenApplePay        (isAvailable, provide* callbacks) ← REMOVED (callbacks → config)
├── AdyenAction          (handle, hide)                    ← Keep
├── AdyenCSE             (encrypt, validate)               ← Keep
├── CardView             (native view, card only)          ← REMOVED
├── ApplePayButton       (native view)                     ← REMOVED
├── GooglePayButton      (native view)                     ← REMOVED
├── SetupModule          (createSession, setup)             ← RENAMED to ContextModule
├── EmbeddedComponentBusModule  (viewId routing)            ← RENAMED to ComponentModule

After (proposal):
├── <AdyenCheckout>      (configuration, context provider)
├── <AdyenComponent>     (checkout, type — generic native view for ANY payment method)
├── useAdyenCheckout     (setup, setupAdvanced, checkout)
│   └── Checkout         (paymentMethods, isAvailable, requiresUserInteraction, submit)
├── AdyenDropIn          (start)
├── AdyenAction          (handle, hide — standalone escape hatch)
├── AdyenCSE             (encrypt, validate)
```
