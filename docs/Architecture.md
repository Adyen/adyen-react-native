# Architecture

`@adyen/react-native` v6 alpha uses a native-owned checkout coordinator. JavaScript is a
small, typed façade. Native code owns Checkout SDK objects, payment-method controllers, suspended
callbacks, redirect registration, and cleanup.

## Public boundary

The generated public report at `etc/api/adyen-react-native.api.md` is authoritative. The portable
checkout surface is:

```ts
interface Checkout {
  readonly flow: 'sessions' | 'advanced';
  readonly paymentMethods: PaymentMethodsView;
  isAvailable(paymentMethod: CheckoutPaymentMethod): Promise<boolean>;
  createController(paymentMethod: CheckoutPaymentMethod): Promise<Controller>;
  invalidate(): Promise<void>;
}

interface PaymentMethodsView {
  readonly regular: PaymentMethodList<CheckoutPaymentMethod>;
  readonly stored: PaymentMethodList<StoredPaymentMethod>;
}

interface PaymentMethodList<T> {
  readonly length: number;
  [Symbol.iterator](): IterableIterator<T>;
  first(predicate?: (paymentMethod: T) => boolean): T | undefined;
}

interface Controller {
  readonly paymentMethod: CheckoutPaymentMethod;
  readonly requiresUserInteraction: boolean;
  submit(): Promise<void>;
}
```

A `Checkout` is obtained only by awaiting `AdyenCheckout.setup(session, configuration, callbacks)`
or `AdyenCheckout.setupAdvanced(paymentMethods, configuration, callbacks)`. It is a read-only
façade: it has no public configuration, native object, callback continuation, or identity field.

The **controller** is the main actor. `await checkout.createController(paymentMethod)` eagerly
creates exactly one native payment component for that payment method and returns a `Controller`
bound to it. `requiresUserInteraction` is resolved from that component at creation.
`<AdyenComponent controller={controller} />` displays the controller's UI. `controller.submit()`
submits it without an embedded view. `AdyenDropIn.start(checkout)` and the standalone
`AdyenAction` and `AdyenCSE` modules are unchanged.

## Payment method identity

Every payment method in `checkout.paymentMethods` is a `CheckoutPaymentMethod` with a required
`id`:

- **Regular methods** get a UUID minted by native code during setup, for both sessions and
  advanced flows. Merchants never supply it; the `PaymentMethodsResponse` passed to
  `setupAdvanced` is unchanged.
- **Stored methods** keep their Checkout API `id`. `StoredPaymentMethod` extends
  `CheckoutPaymentMethod`.

Native stamps the ids into the payment methods JSON it returns to JavaScript and keeps an
id-to-instance catalog for the checkout. Commands pass only the id across the bridge, and native
resolves the exact instance by id, never by type. Two payment methods of the same type, such as
gift cards of different brands, have distinct ids and are distinct to the API.

JavaScript validates ids against the frozen snapshot first. A payment method that does not belong
to the checkout rejects `invalidTarget` without reaching native code. Native repeats the check.

The pinned native SDKs (`6.0.0-alpha.1`) create regular components by type and always build the
first instance of that type. A later same-type instance is therefore never substituted with the
first one: it resolves `isAvailable === false`, and `createController` rejects
`unsupportedCapability`. The pinned iOS SDK also cannot build gift card components.

## Controller semantics

- `createController` is idempotent per payment method id: the same payment method returns the
  same `Controller` instance for the lifetime of the checkout. A failed creation is not cached.
- `isAvailable` resolves `false` for a payment method of the checkout that cannot be created on
  this device or SDK. It rejects `invalidTarget` only for a foreign payment method. Native may
  keep the component created while answering, and `createController` reuses it.
- There is no public `dispose()`. Controllers live and die with their checkout. After the
  checkout is invalidated, replaced, or reaches a terminal callback, `controller.submit()` rejects
  `staleCheckout`.
- `submit()` resolves once submission has started; the payment outcome arrives through the
  checkout callbacks. A controller that requires user interaction and has no mounted view presents
  its UI in a native sheet.
- `AdyenComponent` mounting and unmounting neither creates nor disposes the controller. One
  controller renders in at most one live view: a second simultaneous view stays empty, and
  re-mounting after the first view unmounts is allowed. The component renders nothing for a
  controller whose `requiresUserInteraction` is `false`.

## Lifecycle

There is one active checkout. Setup transitions are serialized:

```text
active -> dispose old checkout -> idle -> create candidate -> active | idle
```

A replacement disposes the old checkout, including all its controllers, before native creation of
the replacement begins. All old handles and controllers become stale immediately. If setup fails,
the failed replacement leaves idle; the old checkout is never restored. A stale command rejects
with `staleCheckout`.

Native permits one interactive payment operation at a time across embedded, headless, and Drop-in
entry points. Explicit competing `controller.submit()` or Drop-in starts reject immediately with
`operationBusy`; they are never queued. A mounted component acquires the operation slot passively,
on its first checkout-level payment callback.

A checkout terminal result, explicit `invalidate()`, replacement, and host loss converge on one
native cleanup path. It disposes every registered controller exactly once and detaches any views
that display them. `invalidate()` is asynchronous and idempotent. It first makes its handle stale,
then resolves after native resources, pending callbacks, owned UI, and event production are
released.

## Generated bridge and Fabric

Checkout, standalone Action, and CSE are generated TurboModules. The embedded component is a Fabric
view. Runtime modules are TurboModule-only, so integrations require React Native 0.82 or newer.

The Checkout TurboModule (`src/specs/NativeAdyenCheckout.ts`) exposes `setupSession`,
`setupAdvanced`, `isAvailable(checkoutId, paymentMethodId)`,
`createController(checkoutId, paymentMethodId)` returning `{controllerId, requiresUserInteraction}`,
`submitController(checkoutId, controllerId)`, `startDropIn`, `respond`, `invalidate`, and the
`onCheckoutEvent` channel. The Fabric view (`NativeAdyenCheckoutComponentView`) takes only
`checkoutId` and `controllerId` and reports `onLayoutChange`.

The coordinator event channel carries private checkout, operation, and request identities plus a
typed event kind. Evolving payment payloads use an explicit JSON boundary. JavaScript dispatches
events only to their owning handle and returns responses only when every identity and kind matches.
Checkout and controller identities never appear in merchant-visible API values or errors.

## Lifecycle and thread-safety invariants

1. **One active checkout.** Setup is serialized; a failed replacement leaves idle.
2. **Stale rejection.** Commands on stale checkouts and their controllers reject `staleCheckout`.
   Setup generation counters guard asynchronous candidates.
3. **Single interactive operation slot.** Competing explicit actions reject `operationBusy`.
4. **Request correlation.** Every suspended merchant callback carries checkout, operation,
   request, and kind identity; native accepts only a full match. Cleanup settles pending requests
   exactly once.
5. **Exactly-once terminal.** One `onComplete` or `onError` per checkout. Terminal delivery cleans
   the checkout and thereby all its controllers.
6. **Exactly-once controller disposal.** Every registered controller is disposed exactly once
   across all teardown paths.
7. **Confinement.** Registry, id catalog, operation, and request state are mutated only on the
   iOS main actor or the Android main thread.
8. **Callback failure determinism.** A thrown or rejected merchant callback resolves to a
   deterministic cancellation; native is never left suspended.

## Capabilities

`AdyenDropIn.start(checkout)` is an identity-only asynchronous façade. Android session Drop-in uses
the official v6 API. Android advanced Drop-in rejects with `unsupportedCapability` before launch on
the pinned `6.0.0-alpha.1` SDK because that release lacks the completion callback needed to return a
terminal result. iOS Drop-in also rejects with `unsupportedCapability` before presenting UI.

iOS supports configured card address lookup. Android rejects address lookup with
`unsupportedCapability` on the pinned SDK and does not show a fallback address UI. Partial payments,
balance/order operations, and stored-method removal are absent from the shipped public surface.

For the JavaScript layer see [js-architecture.md](./js-architecture.md), platform detail see
[native-architecture.md](./native-architecture.md), chronological behavior see
[public-api-flows.md](./public-api-flows.md), and compatibility requirements see
[Compatibility.md](./Compatibility.md).
