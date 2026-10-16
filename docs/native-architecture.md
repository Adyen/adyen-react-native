# Native architecture

Each platform has one serialized checkout coordinator, `CheckoutCoordinator`. The iOS coordinator
is main-actor confined; Android uses a main-thread transition state machine. The coordinator owns
the active checkout, its payment method catalog, the controller registry, the operation slot, the
request broker, native UI, launchers, redirects, and cleanup.

The generated Checkout TurboModule exposes setup, `isAvailable(checkoutId, paymentMethodId)`,
`createController(checkoutId, paymentMethodId)`, `submitController(checkoutId, controllerId)`,
Drop-in start, correlated callback responses, and invalidation. Generated Action and CSE modules
remain independent from checkout state. Fabric is used for embedded components.

## Payment method catalog

During `setupSession` and `setupAdvanced`, `PaymentMethodCatalog` (iOS
`ios/Components/Coordinator/PaymentMethodCatalog.swift`, Android
`component/base/PaymentMethodCatalog.kt`) mints a UUID for every regular payment method and
records the stored methods under their API id. The stamped JSON becomes the descriptor's
`paymentMethodsJson`, so every id JavaScript can send back resolves in the catalog. An unknown id
rejects `invalidTarget`.

Each regular entry records its index, type, and whether it is the first instance of its type. The
pinned `6.0.0-alpha.1` SDKs create regular components by type and always build the first instance,
so a non-first instance is reported unavailable instead of being replaced by the first one. On
Android, `exactTarget` returns no SDK target for such an instance.

## Controller registry

Both coordinators keep a registry of controllers for the active checkout, keyed by an opaque
controller id, plus a payment-method-id to controller-id map that makes creation idempotent.
Payment methods whose creation failed are remembered as unavailable for the lifetime of the
checkout, so availability stays a pure query.

- **iOS:** the registry holds `ComponentProxy` instances. `createController` resolves the exact
  catalog entry, builds the `CheckoutPaymentComponent` eagerly, and reports
  `requiresUserInteraction` as `viewController != nil`. The view controller is read once at
  creation, and every bound view embeds that instance. A failed creation maps to
  `unsupportedCapability`.
- **Android:** the registry holds `ComponentController` instances, one per exact payment method.
  Each delegates to a `ComponentManager`, which owns the SDK `CheckoutController`, its suspended
  callbacks, redirects, and disposal, and routes callbacks to whichever operation currently owns
  the controller. `requiresUserInteraction`
  comes from `CheckoutController.requiresUserInteraction()`. A null or throwing factory maps to
  `unsupportedCapability`.

`isAvailable` is answered by the same registry path: a creatable payment method registers its
controller and resolves `true`, which `createController` then reuses; a non-creatable one resolves
`false`. No throwaway probe component is built.

`submitController` resolves the registry controller and reserves the single operation slot before
asking the component to submit, so a busy contender never reaches the SDK. A controller that
renders in a mounted view submits in place. One that needs shopper input but has no mounted view
is presented in a sheet: on iOS a checkout-owned controller sheet, and on Android the
`CheckoutFragment` bottom sheet hosting the same controller. iOS controller sheets outlive a single
operation: a merchant `retry` releases the slot while the sheet stays visible and cancellable, and
re-submitting reuses the visible sheet. Shopper dismissal is matched by sheet identity and the
active checkout, so a stale sheet cannot cancel a replacement checkout.

## Fabric view binding

The Fabric view (`ADYAdyenComponentView` with `AdyenComponentViewProxy` on iOS,
`AdyenComponentViewState` on Android) receives `checkoutId` and `controllerId`. It binds to the
existing registry controller and never creates or disposes one. Unmounting detaches only the
binding the view created; the controller stays registered. A controller renders in at most one
live view: a second simultaneous bind is rejected and that view stays empty, while re-binding after
detach is allowed. Unknown or stale identities also leave the view empty. When a detached card view
has a pending address lookup, iOS cancels the lookup while keeping the controller.

## Teardown

Invalidation, replacement setup, terminal results, and host loss converge on one cleanup path
(`disposeActiveFlow` on iOS, `invalidateLocked` on Android). It settles pending requests, clears the
registry, and disposes every registered controller exactly once. On Android each controller's
`ComponentManager` settles pending continuations and unregisters its redirects on disposal.
Controller disposal notifies bound views to detach. Controller work that starts during teardown
rejects `staleCheckout`, and a controller created while the checkout was being disposed is disposed
immediately.

## Request correlation

Every suspended native callback has checkout, operation, request, and kind identity. Native accepts
only a full match, so duplicate, late, forged, wrong-kind, and replacement-era responses cannot
settle current work. Native cleanup settles pending requests exactly once even if JavaScript no
longer has listeners.

## Drop-in

Android session Drop-in uses the official v6 `DropIn.start(..., CheckoutContext)` path. Android
advanced Drop-in and iOS Drop-in reject `unsupportedCapability` before UI, as described in
[Architecture.md](./Architecture.md#capabilities). No retired bridge or service path is used.
