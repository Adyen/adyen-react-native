# React Native SDK v6 - Public API Flows

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

    alt Drop-In
        App->>App: AdyenDropIn.start(checkout)
        App->>Native: open(paymentMethods)
        Native->>SDK: Present Drop-In UI
    else Embedded Component
        App->>App: render <AdyenComponent checkout={checkout} type="scheme" />
        Note over App: Native view renders card form<br/>User fills in and taps Pay
    else Headless
        App->>App: await checkout.isAvailable('klarna')
        App->>App: await checkout.requiresUserInteraction('klarna')
        App->>App: checkout.submit('klarna')
    end

    Note over SDK: SDK handles /payments<br/>and /payments/details<br/>automatically

    alt Success
        SDK-->>Native: onComplete(result)
        Native-->>AC: SessionsResult
        AC-->>App: onComplete(result, component)
        App->>App: component.completion(resultCode)
    else Error
        SDK-->>Native: onError(error)
        Native-->>AC: error
        AC-->>App: onError(error, component)
    end

    Note over App: Auto-cleanup on terminal callbacks,<br/>or explicit: checkout.cleanup() / AdyenCheckout.cleanup()
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

    alt Drop-In
        App->>App: AdyenDropIn.start(checkout)
        Native->>SDK: Present Drop-In UI
    else Embedded Component
        App->>View: render <AdyenComponent checkout={checkout} type="scheme" />
        Note over View: Native view renders card form<br/>User fills in and taps Pay
    else Headless
        App->>App: checkout.submit('klarna')
    end

    SDK-->>Native: onSubmit(paymentData)
    Native-->>AC: PaymentMethodData
    AC-->>App: onSubmit(data, component: PaymentSubmitResultHandler)

    App->>Server: /payments(data)
    Server-->>App: response

    alt Action required (3DS2, redirect, etc.)
        App->>App: component.action(response.action)
        Native->>SDK: SubmitResult.Action(action)
        SDK-->>Native: Action UI (3DS2 challenge, redirect, etc.)
        SDK-->>Native: onAdditionalDetails(data)
        AC-->>App: onAdditionalDetails(data, component: PaymentAdditionalResultHandler)
        App->>Server: /payments/details(data)
        Server-->>App: finalResult
        App->>App: component.completion(resultCode)
    else Final result
        App->>App: component.completion(resultCode)
    else Retry (soft decline)
        App->>App: component.retry('Card declined')
        Note over Native: UI stays open,<br/>shopper can retry
    end
```

## Actions Flow (Standalone)

```mermaid
sequenceDiagram
    participant App as Consumer App
    participant Action as AdyenAction
    participant Native as Native Action Module
    participant SDK as Adyen SDK v6

    Note over App: Consumer already has an action<br/>from a /payments response

    App->>Action: handle(action, config)
    Action->>Native: handle(action, config)
    Native->>SDK: Present action UI (3DS2, redirect, QR, voucher)

    alt User completes action
        SDK-->>Native: Action result
        Native-->>Action: PaymentDetailsData
        Action-->>App: Promise resolves with PaymentDetailsData
        App->>Action: hide(true)
    else User cancels / error
        SDK-->>Native: Error
        Native-->>Action: Promise rejects
        App->>Action: hide(false)
    end
```

## Module Architecture

```mermaid
graph TB
    subgraph "Consumer API"
        AC["AdyenCheckout (static class)<br/>setup(), setupAdvanced(), cleanup()"]
        Checkout["Checkout object<br/>paymentMethods, isAvailable,<br/>requiresUserInteraction, submit,<br/>configuration, subscribe, unsubscribe, cleanup"]
    end

    subgraph "Payment Modules"
        DropIn["AdyenDropIn<br/>start(checkout)"]
        Component["&lt;AdyenComponent&gt;<br/>checkout, type"]
    end

    subgraph "Standalone"
        ActionMod["AdyenAction<br/>handle(action): Promise<br/>hide()"]
        CSE["AdyenCSE<br/>encryptCard, encryptBin<br/>validate*"]
    end

    subgraph "Native Modules (internal)"
        Context["ContextModule (AdyenContext)<br/>createSession, setup, cleanup,<br/>isAvailable, requiresUserInteraction, submit,<br/>action, completion, retry"]
        CompMod["ComponentModule (AdyenComponent)<br/>subscribe, unsubscribe,<br/>action, completion, retry"]
        DropInMod["DropInModule (AdyenDropIn)<br/>open, action, completion, retry"]
    end

    AC --> Checkout
    Checkout --> Context
    DropIn --> DropInMod
    Component --> CompMod

    style AC fill:#4a90d9,color:#fff
    style Checkout fill:#4a90d9,color:#fff
    style DropIn fill:#7ed321,color:#fff
    style Component fill:#7ed321,color:#fff
    style ActionMod fill:#e74c3c,color:#fff
    style CSE fill:#95a5a6,color:#fff
    style Context fill:#f5a623,color:#fff
    style CompMod fill:#f5a623,color:#fff
    style DropInMod fill:#f5a623,color:#fff
```
