# Android Bridge Migration Guide: Adyen SDK v5 to v6.0.0-alpha.1

## Overview

The Android native bridge has been rewritten for Adyen Android SDK 6.0.0-alpha.1. The key architectural changes are:

- **Drop-In Service**: `DropInService` now uses `suspend` functions (`onSubmit`, `onAdditionalDetails`) that return typed results (`SubmitResult`, `AdditionalDetailsResult`) instead of v5 callback-based `sendResult(JSONObject)` / `sendAction(Action)`.
- **Component creation**: The v5 component provider pattern (`CardComponent.PROVIDER.get(...)`, `InstantPaymentComponent.PROVIDER.get(...)`) is replaced by `CheckoutController` + Compose `CheckoutPaymentFlow` composable.
- **All v5 callback interfaces removed**: `ComponentCallback<T>`, `SessionComponentCallback<T>`, `ActionComponentCallback`, `DropInCallback`, `SessionDropInCallback` are gone. They are replaced by `AdvancedCheckoutCallbacks`, `SessionCheckoutCallbacks`, `ActionOnlyCheckoutCallbacks`, and `DropInResultCallback`.
- **Compose required**: All component UI is rendered through Jetpack Compose `ComposeView` + `CheckoutPaymentFlow`.

---

## Build Configuration Changes

### Kotlin Version

| Before (v5) | After (v6) |
|---|---|
| `2.0.21` / `2.1.20` | `2.3.21` |

Kotlin 2.3.21 is required for v6 SDK metadata compatibility. Set in `android/gradle.properties`:

```properties
ReactNative_kotlinVersion=2.3.21
```

The root `buildscript` must pin `kotlin-gradle-plugin` to this version:

```groovy
classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:${getExtOrDefault('kotlinVersion')}"
classpath "org.jetbrains.kotlin:compose-compiler-gradle-plugin:${getExtOrDefault('kotlinVersion')}"
```

### Adyen SDK Version

| Before | After |
|---|---|
| `5.19.0` | `6.0.0-alpha.1` |

Set in `android/dependencies.gradle`:

```groovy
adyen_version = "6.0.0-alpha.1"
```

### Jetpack Compose (NEW)

Compose is now required to host the v6 `CheckoutPaymentFlow` composable inside a `ComposeView`. Add to `android/build.gradle`:

```groovy
apply plugin: "org.jetbrains.kotlin.plugin.compose"

android {
  buildFeatures {
    compose true
  }
}

dependencies {
  implementation platform("androidx.compose:compose-bom:$compose_bom_version")
  implementation "androidx.compose.ui:ui"
}
```

With `compose_bom_version = "2026.05.01"` in `dependencies.gradle`.

---

## Package Relocations

All Adyen SDK imports have changed. The `com.adyen.checkout.components.core` and `com.adyen.checkout.sessions.core` packages are replaced by `com.adyen.checkout.core.*`.

| v5 Import | v6 Import |
|---|---|
| `com.adyen.checkout.components.core.action.Action` | `com.adyen.checkout.core.action.data.Action` |
| `com.adyen.checkout.components.core.ActionComponentData` | `com.adyen.checkout.core.action.data.ActionComponentData` |
| `com.adyen.checkout.components.core.PaymentMethodsApiResponse` | `com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethods` |
| `com.adyen.checkout.components.core.PaymentMethod` | `com.adyen.checkout.core.components.data.model.paymentmethod.PaymentMethod` |
| `com.adyen.checkout.components.core.CheckoutConfiguration` | `com.adyen.checkout.core.components.CheckoutConfiguration` |
| `com.adyen.checkout.sessions.core.CheckoutSession` | `com.adyen.checkout.core.common.CheckoutContext` |
| `com.adyen.checkout.sessions.core.SessionModel` | `com.adyen.checkout.core.sessions.SessionResponse` |
| `com.adyen.checkout.sessions.core.SessionPaymentResult` | `com.adyen.checkout.core.components.SessionCheckoutResult` |
| `com.adyen.checkout.card.CardBrand` | `com.adyen.checkout.core.common.CardBrand` |
| `com.adyen.checkout.components.core.ComponentError` | `com.adyen.checkout.core.error.CheckoutError` |
| `com.adyen.checkout.components.core.PaymentComponentState<*>` | `com.adyen.checkout.core.components.data.PaymentComponentData<*>` |
| `com.adyen.checkout.dropin.DropInResult` / `SessionDropInResult` | `com.adyen.checkout.dropin.DropInResult` (unified sealed) |
| `com.adyen.checkout.dropin.DropInCallback` | `com.adyen.checkout.dropin.DropInResultCallback` |

### Validator Relocations

| v5 Import | v6 Import |
|---|---|
| `com.adyen.checkout.card.CardNumberValidator` | `com.adyen.checkout.core.common.helper.CardNumberValidator` |
| `com.adyen.checkout.card.CardExpiryDateValidator` | `com.adyen.checkout.core.common.helper.CardExpiryDateValidator` |
| `com.adyen.checkout.card.CardSecurityCodeValidator` | `com.adyen.checkout.core.common.helper.CardSecurityCodeValidator` |
| `CardNumberValidationResult` | `com.adyen.checkout.core.common.helper.CardNumberValidationResult` |
| `CardExpiryDateValidationResult` | `com.adyen.checkout.core.common.helper.CardExpiryDateValidationResult` |
| `CardSecurityCodeValidationResult` | `com.adyen.checkout.core.common.helper.CardSecurityCodeValidationResult` |

---

## React Native Bridge Module Changes

The React Native bridge layer was refactored after the initial v5→v6 native SDK migration. Several modules were renamed, removed, or consolidated.

### Module Renames

| v5 Module (Registered Name) | v6 Module (Registered Name) | Notes |
|---|---|---|
| `SetupModule` ("AdyenSetup") | `ContextModule` ("AdyenContext") | Unified lifecycle management + headless APIs (session setup, advanced setup, availability checks, submit) |
| `EmbeddedComponentBusModule` ("AdyenComponentBus") | `ComponentModule` ("AdyenComponent") | View event bus — relays action/completion/retry commands to per-view `ComponentContract` consumers |

### Modules Removed

| v5 Module | Replacement |
|---|---|
| `GooglePayModule` | Google Pay availability checks via `ContextModule.isAvailable("googlepay")`; rendering via `AdyenComponentViewManager` |
| `ApplePayModuleMock` | Removed — Android mock no longer needed; `ContextModule.isAvailable("applepay")` returns `false` |
| `InstantModule` | Instant payment methods handled via `ContextModule` headless APIs (`requiresUserInteraction`, `submit`) + `ComponentModule` / `AdyenComponentViewManager` |
| `SessionHelperModule` | Consolidated into `ContextModule` (`createSession()` / `setup()` methods) |

### View Manager Renames

| v5 View Manager | v6 View Manager | Notes |
|---|---|---|
| `CardViewManager` ("AdyenCardView") | `AdyenComponentViewManager` ("AdyenComponentView") | Generic — handles all payment method types via `type` prop |
| `PlatformPayViewManager` | `AdyenComponentViewManager` ("AdyenComponentView") | Merged into the generic view manager |

### Current Module Registration (`AdyenPaymentPackage.kt`)

```kotlin
// createNativeModules:
DropInModule, ComponentModule, AdyenCSEModule, ContextModule, ActionModule

// createViewManagers:
AdyenComponentViewManager
```

---

## Removed Interfaces and Types

| v5 Type | v6 Replacement | Notes |
|---|---|---|
| `ComponentCallback<T>` | `AdvancedCheckoutCallbacks` | Lambdas for `onSubmit`/`onAdditionalDetails`/`onComplete`/`onFailure` |
| `SessionComponentCallback<T>` | `SessionCheckoutCallbacks` | Lambdas for `onComplete`/`onFailure` |
| `ActionComponentCallback` | `ActionOnlyCheckoutCallbacks` | Lambdas for `onAdditionalDetails`/`onFailure` |
| `ComponentError` | `CheckoutError` | Has `CheckoutError.ErrorCode` enum (e.g. `CANCELLED`) |
| `PaymentComponentState<*>` | `PaymentComponentData<*>` | Used as `onSubmit` parameter |
| `ComponentAvailableCallback` | Custom `GooglePayAvailability` | See Google Pay section |
| `DropInCallback` / `SessionDropInCallback` | `DropInResultCallback` | Unified interface with `onDropInResult(DropInResult)` |
| `DropInResult` / `SessionDropInResult` (v5) | `DropInResult` sealed class | `Completed(resultCode)` / `Failed(error)` / `Cancelled` |
| `PaymentMethodsApiResponse` | `PaymentMethods` | Renamed; same serializer pattern |
| `SessionModel` | `SessionResponse` | Constructor: `SessionResponse(id, sessionData)` |
| `CheckoutSession` | `CheckoutContext.Sessions` | Created via `Checkout.setup()` |
| `CheckoutSessionProvider` | `Checkout.setup()` | Static factory returning `Checkout.Result<CheckoutContext>` |
| `CheckoutSessionResult` | `Checkout.Result<T>` | Sealed: `Success(checkoutContext)` / `Error(error)` |

---

## New v6 Types

### CheckoutController

Replaces all v5 component providers (`CardComponent.PROVIDER.get()`, `InstantPaymentComponent.PROVIDER.get()`, etc.).

```kotlin
// Advanced flow
CheckoutController(
  target = CheckoutTarget.PaymentMethod("scheme"),
  context = checkoutContext,          // Checkout.Result.Success.checkoutContext
  callbacks = advancedCallbacks(),
  coroutineScope = activity.lifecycleScope,
)

// Sessions flow
CheckoutController(
  target = CheckoutTarget.PaymentMethod(paymentMethodType),
  context = sessionContext,           // CheckoutContext.Sessions
  callbacks = sessionCallbacks(),
  coroutineScope = activity.lifecycleScope,
)

// Action-only flow
CheckoutController(
  context = actionCheckoutContext,
  callbacks = actionCallbacks(),
  coroutineScope = activity.lifecycleScope,
)
```

### CheckoutTarget

Specifies which payment method the controller drives:

```kotlin
CheckoutTarget.PaymentMethod("scheme")      // Card
CheckoutTarget.PaymentMethod("googlepay")   // Google Pay
CheckoutTarget.PaymentMethod("ideal")       // iDEAL
CheckoutTarget.PaymentMethod("twint")       // Twint
```

### AdvancedCheckoutCallbacks

Lambda-based callbacks for the advanced flow:

```kotlin
AdvancedCheckoutCallbacks(
  onSubmit = { data: PaymentComponentData<*> ->
    suspendCancellableCoroutine { continuation ->
      submitContinuation = continuation
      messageBus.onSubmit(data, returnUrl())
    }
  },
  onAdditionalDetails = { data: ActionComponentData ->
    suspendCancellableCoroutine { continuation ->
      additionalDetailsContinuation = continuation
      messageBus.onAdditionalDetails(data)
    }
  },
  onFailure = { error: CheckoutError -> messageBus.onException(error.toModuleException()) },
  onComplete = { result -> messageBus.onFinished(result.resultCode.value) },
) {
  // Optional: Card-specific callbacks
  card(
    onBinChange = { binValue -> messageBus.onBinValue(binValue) },
    onBinLookup = { data -> messageBus.onBinLookup(listOf(data)) },
  )
}
```

### SessionCheckoutCallbacks

Lambda-based callbacks for the sessions flow:

```kotlin
SessionCheckoutCallbacks(
  onComplete = { result -> messageBus.onFinished(result) },
  onFailure = { error -> messageBus.onSessionException(error.toModuleException()) },
) {
  card(
    onBinChange = { binValue -> messageBus.onBinValue(binValue) },
    onBinLookup = { data -> messageBus.onBinLookup(listOf(data)) },
  )
}
```

### ActionOnlyCheckoutCallbacks

Used by the standalone `ActionModule` for handling actions without a payment flow:

```kotlin
ActionOnlyCheckoutCallbacks(
  onAdditionalDetails = { data ->
    resolve(data)
    AdditionalDetailsResult.Completion(CheckoutResultCode.AUTHORISED.value)
  },
  onFailure = { error -> reject(error.toModuleException()) },
)
```

### SubmitResult (sealed)

Returned from `suspend fun onSubmit()` to tell the SDK what to do next:

```kotlin
SubmitResult.Action(action)          // Continue with an action (3DS, redirect, etc.)
SubmitResult.Completion(resultCode)  // Payment finished
SubmitResult.Retry(errorMessage)     // Show error, let shopper retry
```

### AdditionalDetailsResult (sealed)

Returned from `suspend fun onAdditionalDetails()`:

```kotlin
AdditionalDetailsResult.Completion(resultCode)  // Action handling finished
```

### CheckoutPaymentFlow (Compose)

The composable that renders the payment UI. Hosted in a `ComposeView`:

```kotlin
val composeView = ComposeView(context).apply {
  setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
}

composeView.setContent {
  CheckoutPaymentFlow(controller = checkoutController)
}
```

### CheckoutResultCode (enum)

```kotlin
CheckoutResultCode.AUTHORISED
CheckoutResultCode.REFUSED
CheckoutResultCode.ERROR
// etc.
```

### CheckoutError

Replaces `ComponentError`. Includes a typed error code:

```kotlin
CheckoutError.ErrorCode.CANCELLED  // Shopper cancelled the flow
```

### CheckoutControllerRegistry

Tracks active `CheckoutController` instances using a `WeakHashMap` so redirect intents can be dispatched:

```kotlin
// Register when creating a controller
CheckoutControllerRegistry.register(controller)

// Unregister on dispose
CheckoutControllerRegistry.unregister(controller)

// Dispatch redirects from onNewIntent
CheckoutControllerRegistry.handleReturn(intent)
```

### SessionResponse

Replaces `SessionModel` for creating sessions:

```kotlin
SessionResponse(
  id = sessionId,
  sessionData = sessionData,
)
```

---

## Drop-In Service Changes

### Before (v5)

```kotlin
class AdvancedCheckoutService : DropInService() {
  override fun onSubmit(state: PaymentComponentState<*>) {
    // Make /payments call
    val response: JSONObject = makePaymentsCall(state.data)
    // Return result
    sendResult(response)           // or sendAction(action)
  }

  override fun onAdditionalDetails(data: ActionComponentData) {
    val response: JSONObject = makeDetailsCall(data)
    sendResult(response)
  }
}
```

### After (v6)

```kotlin
class AdvancedCheckoutService : DropInService() {
  private var submitContinuation: CancellableContinuation<SubmitResult>? = null
  private var additionalDetailsContinuation: CancellableContinuation<AdditionalDetailsResult>? = null

  override suspend fun onSubmit(data: PaymentComponentData<*>): SubmitResult =
    suspendCancellableCoroutine { continuation ->
      submitContinuation = continuation
      // Dispatch event to JS -- JS will call back via provideSubmitResult()
      AdyenPaymentPackage.messageBus.onSubmit(data, getReturnUrl())
    }

  override suspend fun onAdditionalDetails(data: ActionComponentData): AdditionalDetailsResult =
    suspendCancellableCoroutine { continuation ->
      additionalDetailsContinuation = continuation
      AdyenPaymentPackage.messageBus.onAdditionalDetails(data)
    }

  fun provideSubmitResult(result: SubmitResult) {
    submitContinuation?.resume(result)
    submitContinuation = null
  }

  fun provideAdditionalDetailsResult(result: AdditionalDetailsResult) {
    additionalDetailsContinuation?.resume(result)
    additionalDetailsContinuation = null
  }

  fun finish(resultCode: String) {
    submitContinuation?.let {
      it.resume(SubmitResult.Completion(resultCode))
      submitContinuation = null
      return
    }
    additionalDetailsContinuation?.let {
      it.resume(AdditionalDetailsResult.Completion(resultCode))
      additionalDetailsContinuation = null
    }
  }

  fun finish(errorMessage: String?) {
    submitContinuation?.let {
      it.resume(SubmitResult.Retry(errorMessage))
      submitContinuation = null
      return
    }
  }
}
```

Key differences:
- `onSubmit` and `onAdditionalDetails` are now `suspend` functions that **return** typed results.
- Uses `suspendCancellableCoroutine` with `CancellableContinuation` to bridge asynchronous JS responses.
- `sendResult(JSONObject)` / `sendAction(Action)` replaced by returning `SubmitResult.Action(action)`, `SubmitResult.Completion(resultCode)`, or `SubmitResult.Retry(errorMessage)`.
- The `SessionCheckoutService` implements the same contract but stubs the methods since the SDK handles `/payments` calls internally in the sessions flow.

---

## Drop-In Launch Changes

### Before (v5)

```kotlin
// Registration
val dropInLauncher = DropIn.startPayment(activity, resultLauncher)

// Advanced launch
DropIn.startPayment(activity, paymentMethods, configuration, AdvancedCheckoutService::class.java)

// Session launch  
DropIn.startPayment(activity, session, SessionCheckoutService::class.java)
```

### After (v6)

```kotlin
// Registration -- in AdyenCheckout.setLauncherActivity()
val callbackHandler = DropInCallbackHandler { AdyenPaymentPackage.messageBusOrNull() }
val dropInLauncher: DropInLauncher = DropIn.registerForResult(activity, callbackHandler)

// Advanced launch
appCompatActivity.lifecycleScope.launch {
  when (val result = Checkout.setup(paymentMethods, checkoutConfiguration)) {
    is Checkout.Result.Success -> {
      DropIn.start(dropInLauncher, result.checkoutContext, AdvancedCheckoutService::class.java)
    }
    is Checkout.Result.Error -> { /* handle error */ }
  }
}

// Session launch
DropIn.start(dropInLauncher, sessionContext, SessionCheckoutService::class.java)
```

Key differences:
- `DropIn.registerForResult(activity, callback)` returns a `DropInLauncher` (unified, no separate session/advanced launchers).
- `DropIn.start(launcher, checkoutContext, serviceClass)` replaces `DropIn.startPayment()`.
- Advanced flow requires `Checkout.setup(paymentMethods, configuration)` first to create a `CheckoutContext`.
- `DropInResultCallback` replaces both `DropInCallback` and `SessionDropInCallback`.
- `DropInResult` is a sealed interface: `Completed(resultCode: CheckoutResultCode)`, `Failed(error: CheckoutError)`, `Cancelled`.

### DropInCallbackHandler

Bridges the v6 `DropInResult` to the React Native `MessageBus`:

```kotlin
class DropInCallbackHandler(
  private val messageBusProvider: () -> MessageBus?,
) : DropInResultCallback {
  override fun onDropInResult(result: DropInResult) {
    when (result) {
      is DropInResult.Completed -> {
        if (isSession) messageBus.onFinished(SessionCheckoutResult(...))
        else messageBus.onFinished(result.resultCode.value)
      }
      is DropInResult.Failed -> messageBus.onException(ModuleException.Unknown(result.error))
      is DropInResult.Cancelled -> messageBus.onException(ModuleException.Canceled())
    }
  }
}
```

### DropInModule result mapping

The `action()`, `completion()`, and `retry()` methods on `DropInModule` map directly to `SubmitResult` variants:

```kotlin
// action() → SubmitResult.Action
fun action(actionMap: ReadableMap) {
    val action = parseActionFromMap(actionMap)
    advancedService?.provideSubmitResult(SubmitResult.Action(action))
}

// completion() → SubmitResult.Completion
fun completion(resultCode: String) {
    advancedService?.finish(resultCode)
}

// retry() → SubmitResult.Retry
fun retry(message: String?) {
    advancedService?.finish(message)
}
```

---

## Component Creation (Embedded)

### Before (v5)

```kotlin
// Card component via provider
val cardComponent = CardComponent.PROVIDER.get(fragment, paymentMethod, configuration, callback)

// XML layout
<com.adyen.checkout.card.AdyenComponentView
    android:id="@+id/adyenComponentView"
    android:layout_width="match_parent"
    android:layout_height="wrap_content" />

// Per-method fragments for instant payments
class IdealFragment : BaseInstantComponentFragment() { ... }
class TwintFragment : BaseInstantComponentFragment() { ... }
class PayByBankGlobalFragment : BaseInstantComponentFragment() { ... }
class PayByBankUSFragment : BaseInstantComponentFragment() { ... }
```

### After (v6)

```kotlin
// ComponentManager (unified) creates the controller
val manager = ComponentManager(activity, messageBus)
val controller = manager.createController(configuration, paymentMethodJson)

// Compose rendering in ComposeView
val composeView = ComposeView(activity).apply {
  setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed)
}
composeView.setContent {
  CheckoutPaymentFlow(controller = controller)
}

// Single InstantFragment for all instant payment methods
class InstantFragment : BottomSheetDialogFragment() {
  override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    val controller = InstantModule.currentManager?.checkoutController
    (view as ComposeView).setContent {
      CheckoutPaymentFlow(controller = controller)
    }
    if (!submitted && !controller.requiresUserInteraction()) {
      submitted = true
      controller.submit()
    }
  }
}
```

Key differences:
- No `PROVIDER.get()` -- use `CheckoutController(target, context, callbacks, coroutineScope)`.
- No XML `AdyenComponentView` -- use `ComposeView` + `CheckoutPaymentFlow(controller)`.
- Single `InstantFragment` replaces all per-method fragment classes.
- `controller.submit()` triggers the payment (replaces the old auto-submit behavior).
- `controller.requiresUserInteraction()` determines if auto-submit is safe.

---

## Redirect Handling

### Before (v5)

```kotlin
object AdyenCheckout {
  // Held a weak reference to a single ActionHandlingComponent
  fun handleIntent(intent: Intent): Boolean {
    actionHandlingComponent?.handleIntent(intent)
  }
}
```

### After (v6)

```kotlin
object AdyenCheckout {
  fun handleIntent(intent: Intent): Boolean {
    if (intent.data == null) return false
    return CheckoutControllerRegistry.handleReturn(intent)
  }
}

internal object CheckoutControllerRegistry {
  // WeakHashMap of active CheckoutController instances
  private val controllers: MutableSet<CheckoutController> =
    Collections.synchronizedSet(Collections.newSetFromMap(WeakHashMap()))

  fun register(controller: CheckoutController) { controllers.add(controller) }
  fun unregister(controller: CheckoutController) { controllers.remove(controller) }

  fun handleReturn(intent: Intent): Boolean {
    val snapshot = synchronized(controllers) { controllers.toList() }
    if (snapshot.isEmpty()) return false
    snapshot.forEach { it.handleReturn(intent) }
    return true
  }
}
```

Key differences:
- `CheckoutControllerRegistry` replaces the single-reference model with a `WeakHashMap`-based registry.
- All active controllers receive the intent; only the one with a pending redirect action processes it.
- Component managers (`GooglePayComponentManager`, `InstantComponentManager`, `CardComponentManager`) register/unregister controllers on create/dispose.
- `CheckoutController.handleReturn(intent)` replaces `ActionHandlingComponent.handleIntent(intent)`.
- `handleActivityResult()` is deprecated and no-ops.

---

## Session Flow

### Before (v5)

```kotlin
// Create session
CheckoutSessionProvider.createSession(
  sessionModel,         // SessionModel(id, sessionData)
  configuration,        // CheckoutConfiguration
  callback              // CheckoutSessionResult callback
)

// In callback
override fun onResult(result: CheckoutSessionResult) {
  when (result) {
    is CheckoutSessionResult.Success -> {
      val session = result.checkoutSession
      // Use session with DropIn or Component
    }
    is CheckoutSessionResult.Error -> { /* handle */ }
  }
}
```

### After (v6)

```kotlin
// Parse session from JS
val sessionResponse = SessionResponse(
  id = json.optString("id"),
  sessionData = json.optString("sessionData", null),
)

// Create session context (suspend)
when (val result = Checkout.setup(sessionResponse, configuration)) {
  is Checkout.Result.Success -> {
    val checkoutContext: CheckoutContext.Sessions = result.checkoutContext
    BaseModule.session = checkoutContext
    // Return session setup response to JS
    val jsonObject = SessionSetupResponse.SERIALIZER.serialize(
      checkoutContext.checkoutSession.sessionSetupResponse
    )
    promise.resolve(ReactNativeJson.convertJsonToMap(jsonObject))
  }
  is Checkout.Result.Error -> {
    promise.reject(ModuleException.SessionError(result.error.cause))
  }
}
```

Key differences:
- `Checkout.setup(sessionResponse, configuration)` replaces `CheckoutSessionProvider.createSession()`.
- Returns `Checkout.Result<CheckoutContext.Sessions>` (sealed class, not callback).
- `SessionResponse(id, sessionData)` replaces `SessionModel`.
- The result `CheckoutContext.Sessions` is stored in `BaseModule.session` for use by Drop-In and component modules.

---

## Files Added

| File | Purpose |
|---|---|
| `CheckoutControllerRegistry.kt` | Tracks active `CheckoutController` instances in a `WeakHashMap` for redirect routing. Dispatches `handleReturn(intent)` to all registered controllers. |
| `ComponentManager.kt` | Unified manager (in `component/base/`) that builds and drives the v6 `CheckoutController` for all payment methods (card, Google Pay, instant). Manages suspend continuations for the advanced flow. Registers/unregisters with `CheckoutControllerRegistry`. Replaces the former per-method managers (`CardComponentManager`, `GooglePayComponentManager`, `InstantComponentManager`). |
| `GooglePayAvailability.kt` | Custom Google Pay availability check using Google Play Services + Wallet APIs. Required because v6 removed the public `GooglePayComponent.PROVIDER.isAvailable`. |
| `ContextModule.kt` | Replaces `SetupModule`. Unified lifecycle + headless API module registered as `"AdyenContext"`. Handles session setup, advanced setup, availability checks, `requiresUserInteraction`, and `submit`. |
| `ComponentModule.kt` | Merged from `EmbeddedComponentBusModule`. View event bus module registered as `"AdyenComponent"`. Relays action/completion/retry commands by viewId to per-view `ComponentContract` consumers. |
| `AdyenComponentViewManager.kt` | Replaces `CardViewManager` and `PlatformPayViewManager`. Generic view manager registered as `"AdyenComponentView"` that handles all payment method types via the `type` prop. |
| `AdyenComponentViewState.kt` | Replaces `CardViewState`. Per-view state that owns the `ComponentManager`, renders `CheckoutPaymentFlow` in a `ComposeView`, and implements `ComponentContract` for receiving commands from `ComponentModule`. |

---

## Files Removed

| File | Purpose (v5) |
|---|---|
| `ComponentSessionCallback.kt` | v5 `SessionComponentCallback` implementation (dead code) |
| `ComponentAdvancedCallback.kt` | v5 `ComponentCallback` implementation (dead code) |
| `ComponentData.kt` | v5 component data holder |
| `AdvancedComponentViewModel.kt` | v5 viewmodel for advanced flow (dead code) |
| `SessionsComponentViewModel.kt` | v5 viewmodel for sessions flow (dead code) |
| `BaseViewModel.kt` | v5 base viewmodel class (dead code) |
| `CardComponentManager.kt` | Replaced by unified `ComponentManager` |
| `GooglePayComponentManager.kt` | Replaced by unified `ComponentManager` |
| `InstantComponentManager.kt` | Replaced by unified `ComponentManager` |
| `BaseInstantComponentFragment.kt` | v5 base class for per-method instant fragments |
| `BaseComponentFragment.kt` | v5 base class for component fragments |
| `IInstantFragment.kt` | v5 interface for instant fragments |
| `InstantFragmentDelegate.kt` | v5 delegate for instant fragment logic |
| `TwintFragment.kt` | v5 Twint-specific fragment |
| `IdealFragment.kt` | v5 iDEAL-specific fragment |
| `PayByBankGlobalFragment.kt` | v5 PayByBank (global) fragment |
| `PayByBankUSFragment.kt` | v5 PayByBank (US) fragment |
| `fragment_instant.xml` | v5 XML layout for instant components |
| `InstantModuleTest.kt` | v5 test for InstantModule |
| `SetupModule.kt` | Replaced by `ContextModule` |
| `EmbeddedComponentBusModule.kt` | Replaced by `ComponentModule` |
| `GooglePayModule.kt` | Removed — consolidated into `ContextModule` headless APIs |
| `ApplePayModuleMock.kt` | Removed — Android mock no longer needed |
| `CardViewManager.kt` | Replaced by `AdyenComponentViewManager` |
| `PlatformPayViewManager.kt` | Replaced by `AdyenComponentViewManager` |
| `CardViewState.kt` | Replaced by `AdyenComponentViewState` |
| `PlatformPayView.kt` | Removed — platform pay handled by generic `AdyenComponentViewManager` |

---

## Module-by-Module Changes

### DropInModule

- **Registration**: `register(activity)` now calls `DropIn.registerForResult(activity, callbackHandler)` returning a `DropInLauncher` stored in the companion object.
- **open()**: Advanced flow calls `Checkout.setup(paymentMethods, configuration)` then `DropIn.start(dropInLauncher, checkoutContext, AdvancedCheckoutService::class.java)`. Sessions flow calls `DropIn.start(dropInLauncher, sessionContext, SessionCheckoutService::class.java)`.
- **action()**: Calls `advancedService.provideSubmitResult(SubmitResult.Action(action))` instead of `sendAction()`. Replaces the former `handle()` method.
- **completion()**: Calls `advancedService.finish(resultCode)` to resume any pending continuation with `SubmitResult.Completion(resultCode)`. Replaces the former `hide(true)` pattern.
- **retry()**: Calls `advancedService.finish(errorMessage)` to resume any pending continuation with `SubmitResult.Retry(errorMessage)`. Replaces the former `hide(false, message)` pattern.
- **`providePaymentResult()` / `provideAdditionalDetailsResult()`**: Removed. The new `action()`, `completion()`, and `retry()` methods replace this functionality.

### DropInCallbackHandler

- **New file** implementing `DropInResultCallback`.
- Bridges `DropInResult.Completed`, `DropInResult.Failed`, `DropInResult.Cancelled` to `MessageBus` events.
- Replaces both v5 `DropInCallback` and `SessionDropInCallback` patterns.

### ContextModule (AdyenContext)

Replaces `SetupModule` ("AdyenSetup") and absorbs `SessionHelperModule`. Registered as `"AdyenContext"`. Serves as the unified lifecycle and headless API entry point.

- **`COMPONENT_NAME = "AdyenContext"`**
- **`createSession(sessionModelJSON, configurationJSON, promise)`**: Session flow setup. Calls `cleanup()` first to dispose stale controllers, then `Checkout.setup(sessionResponse, configuration)`. Stores the resulting `CheckoutContext.Sessions` in `BaseModule.checkoutContext`. Returns the serialized `SessionSetupResponse` to JS.
- **`setup(paymentMethodsData, configurationJSON, promise)`**: Advanced flow setup. Calls `cleanup()` first, then `Checkout.setup(paymentMethods, configuration)`. Stores the resulting `CheckoutContext.Advanced` in `BaseModule.checkoutContext`.
- **`isAvailable(type, promise)`**: Checks payment method availability:
  - `"applepay"` → always returns `false` (not available on Android)
  - `"googlepay"` / `"googlepay_legacy"` → delegates to `GooglePayAvailability.isAvailable()` (after checking the payment methods list)
  - All other types → checks if the type exists in the `paymentMethods` list of the current `CheckoutContext`
- **`requiresUserInteraction(type, promise)`**: Creates (and caches) a `ComponentManager` for the given type, builds a `CheckoutController`, and returns `controller.requiresUserInteraction()`.
- **`submit(type)`**: Resolves the cached controller for the given type and calls `controller.submit()`.
- **`cleanup()`**: Disposes all cached `ComponentManager` instances, clears the map, and resets `checkoutContext` via `super.cleanup()`.
- **Re-setup safety**: Both `createSession()` and `setup()` call `cleanup()` before initializing, ensuring no stale controllers or contexts are reused.

### ComponentModule (AdyenComponent)

Replaces `EmbeddedComponentBusModule` ("AdyenComponentBus"). Registered as `"AdyenComponent"`. Extends `BaseActionModule`.

The merged result of the old modal `ComponentModule` and `EmbeddedComponentBusModule`, this module serves as the view event bus for embedded `<AdyenComponent>` views.

- **`COMPONENT_NAME = "AdyenComponent"`**
- **View event bus pattern**: `subscribe(viewId)` / `unsubscribe(viewId)` manage per-view registration. Each view registers a `ComponentContract` implementation (typically `AdyenComponentViewState`) via the static `register(viewId, contract)` / `unregister(viewId)` methods.
- **Command relay**: `action(viewId, actionMap)`, `completion(viewId, resultCode)`, and `retry(viewId, message)` are routed by `viewId` to the corresponding per-view `ComponentContract` consumer:
  - `action` → `consumer.onAction(action)` — resumes an in-flight submission with a merchant action
  - `completion` → `consumer.onFinalResult(true, null)` — resolves with a terminal result, unregisters the view
  - `retry` → `consumer.onFinalResult(false, message)` — re-prompts the shopper; the view remains registered if the consumer retains it
- **Address lookup**: `update(viewId, array)` and `confirm(viewId, success, address)` are accepted but inert (stubbed for v6 alpha).
- **Cleanup**: When all subscribed views are unsubscribed, calls `cleanup()` to reset state.

### AdvancedCheckoutService

- **Extends**: v6 `DropInService` (same class name, new package/API).
- **onSubmit()**: Now `suspend fun onSubmit(data: PaymentComponentData<*>): SubmitResult`. Uses `suspendCancellableCoroutine` to pause until JS responds.
- **onAdditionalDetails()**: Now `suspend fun onAdditionalDetails(data: ActionComponentData): AdditionalDetailsResult`. Same coroutine pattern.
- **provideSubmitResult() / provideAdditionalDetailsResult() / finish()**: Resume the suspended coroutine with typed results.

### SessionCheckoutService

- **Extends**: v6 `DropInService`.
- **onSubmit()**: Stubs with `SubmitResult.Retry()` (SDK handles payments internally in sessions flow).
- **onAdditionalDetails()**: Stubs with `AdditionalDetailsResult.Completion(ERROR)`.
- Minimal implementation since the sessions SDK drives the flow.

### SessionHelperModule (REMOVED)

`SessionHelperModule` has been consolidated into `ContextModule`. All session setup functionality (`createSession`, `parseSessionResponse`, result serialization) is now handled by `ContextModule.createSession()`. See the [ContextModule (AdyenContext)](#contextmodule-adyencontext) section above.

### BaseModule

- **Primary field**: `checkoutContext: CheckoutContext?` (static/companion property). The former `session` field is now a computed property getter that casts `checkoutContext` to `CheckoutContext.Sessions`.
- **getPaymentMethods()**: Deserializes to `PaymentMethods` (was `PaymentMethodsApiResponse`).
- **getPaymentMethod()**: Returns `PaymentMethod` (same name, new package).
- **completion(resultCode)**: Abstract method replacing the former `hide(success, message)`. Signals payment completion.
- **retry(message)**: Abstract method replacing the former error-case `hide()`. Signals the shopper should retry.

### InstantModule (REMOVED)

`InstantModule` has been removed. Instant payment methods are now handled via `ContextModule` headless APIs (`requiresUserInteraction`, `submit`) for headless flows, and `ComponentModule` / `AdyenComponentViewManager` for embedded view flows. See the [ContextModule (AdyenContext)](#contextmodule-adyencontext) and [ComponentModule (AdyenComponent)](#componentmodule-adyencomponent) sections above.

### GooglePayModule (REMOVED)

`GooglePayModule` has been removed as a standalone module. Google Pay availability is now checked via `ContextModule.isAvailable("googlepay")`, which delegates to `GooglePayAvailability.kt` internally. Google Pay rendering is handled by `AdyenComponentViewManager` like all other payment methods. See the [ContextModule (AdyenContext)](#contextmodule-adyencontext) and [AdyenComponentViewManager](#adyencomponentviewmanager) sections.

### ActionModule

- **action()**: Calls `Checkout.setup(action, configuration)` then creates a `CheckoutController` with `ActionOnlyCheckoutCallbacks`. Replaces the former `handle()`.
- **completion()**: Resolves any pending continuation with the result code.
- **retry()**: Retries the action flow with an optional error message.
- **Rendering**: Shows `ActionFragment` containing `ComposeView` + `CheckoutPaymentFlow(controller)`.
- **Callbacks**: `ActionOnlyCheckoutCallbacks.onAdditionalDetails` resolves the promise with the `ActionComponentData`; `onFailure` rejects.
- **Registry**: Registers/unregisters controller with `CheckoutControllerRegistry`.

### CSEModule (AdyenCSEModule)

- **CardBrand**: Import changed to `com.adyen.checkout.core.common.CardBrand`.
- **Validators**: Import changed to `com.adyen.checkout.core.common.helper.*` (see Package Relocations table).
- **CardEncrypter / UnencryptedCard / EncryptionException**: Unchanged (still in `com.adyen.checkout.cse`).

### ComponentManager (unified)

The per-method managers (`CardComponentManager`, `GooglePayComponentManager`, `InstantComponentManager`) have been unified into a single `ComponentManager` class in `component/base/`:

- **createController()**: Builds `CheckoutController` with `CheckoutTarget.PaymentMethod(type)` and `AdvancedCheckoutCallbacks` / `SessionCheckoutCallbacks`.
- **Card-specific callbacks**: Uses `card { onBinChange; onBinLookup }` block inside callbacks for BIN events.
- **handleAction() / finish() / dispose()**: Same continuation pattern for all payment methods.

### AdyenComponentViewManager

Replaces both `CardViewManager` ("AdyenCardView") and `PlatformPayViewManager`. Registered as `"AdyenComponentView"`.

- **Generic**: Handles all payment method types through a single view manager. The payment method is determined by the `type` prop set from JS.
- **`createViewInstance()`**: Creates a `DynamicComponentView` paired with an `AdyenComponentViewState` (replaces the former `CardViewState`).
- **Props**: `setType(view, value)` sets the payment method type (e.g. `"scheme"`, `"googlepay"`, `"ideal"`); `setConfiguration(view, value)` sets the checkout configuration JSON.
- **Rendering**: `AdyenComponentViewState.renderView()` creates a `ComposeView`, builds a `ComponentManager` with optional card-specific callbacks (BIN change/lookup for `"scheme"` type), calls `manager.createController(checkoutContext, paymentMethodType)`, then sets `CheckoutPaymentFlow(controller)` as content.
- **View bus integration**: Each view registers itself as a `ComponentContract` with `ComponentModule.register(viewId, this)`, enabling `ComponentModule` to relay action/completion/retry commands to the correct view.
- **Disposal**: `dispose()` unregisters from `ComponentModule`, disposes the `ComponentManager`, and clears state.

### AdyenCheckout (entry point)

- **setLauncherActivity()**: Delegates to `DropInModule.register(activity)` which calls `DropIn.registerForResult()`.
- **handleIntent()**: Delegates to `CheckoutControllerRegistry.handleReturn(intent)` instead of forwarding to a single action-handling component.
- **handleActivityResult()**: Deprecated and no-ops.

### CheckoutConfigurationFactory

- **Return type**: `CheckoutConfiguration` from `com.adyen.checkout.core.components` (was `com.adyen.checkout.components.core`).
- **Builder pattern**: Uses the v6 `CheckoutConfiguration(environment, clientKey, shopperLocale, amount, analyticsConfiguration) { ... }` constructor with trailing lambda for component-specific configuration.

---

## Known Alpha Limitations

1. **Partial payments stubbed**: `provideBalance()`, `provideOrder()`, and `providePaymentMethods()` in `DropInModule` are stubbed with `TODO` comments:
   ```kotlin
   @ReactMethod
   fun provideBalance(success: Boolean, balance: ReadableMap?, error: ReadableMap?) {
     // TODO: v6 alpha - partial payments are not yet supported
   }
   ```

2. **Stored payment removal stubbed**: `removeStored()` in `DropInModule` is stubbed:
   ```kotlin
   @ReactMethod
   fun removeStored(success: Boolean) {
     // TODO: v6 alpha - stored payment method removal is not yet supported
   }
   ```

3. **Address lookup stubbed**: `update()` and `confirm()` in both `DropInModule` and `ComponentModule` are stubbed:
   ```kotlin
   @ReactMethod
   fun update(viewId: String, array: ReadableArray?) {
     // TODO: v6 alpha - address lookup is not yet supported
   }
   ```

4. **Modules removed and consolidated**: `GooglePayModule`, `InstantModule`, `ApplePayModuleMock`, and `SessionHelperModule` have been removed and consolidated into `ContextModule` headless APIs and `ComponentModule` / `AdyenComponentViewManager`.

5. **Google Pay availability workaround**: v6 removed the public `GooglePayComponent.PROVIDER.isAvailable()` API. The bridge implements a custom `GooglePayAvailability` object using Google Play Services + Wallet APIs directly. See `COSDK-1310`.

6. **Native Android tests cannot run**: Tests require Robolectric + `kotlinx-coroutines-test` for the suspend-based service/controller patterns, but these dependencies are not added. The v5 `InstantModuleTest` was removed.

7. **Kotlin deprecation warnings**: Some v5-era types still imported from `components.core` (e.g., `LookupAddress`, `AddressData`, `Order`) may produce deprecation warnings until the v6 SDK provides equivalents.
