# Public API flows

These flows describe public behavior. Internal identities are intentionally not exposed.

## Setup and replacement

```text
await setup(A) -> A active
await setup(B) -> dispose A and its controllers -> create B -> B active
await setup(C fails) -> dispose B and its controllers -> create C fails -> idle
```

Setup is serialized. A handle resolves only after native setup commits. Replacement disposes the old
checkout before the new factory runs. Failed replacement leaves idle. Commands from an older handle,
or from any controller it created, reject `staleCheckout`.

## Payment methods and controllers

`checkout.paymentMethods` is a frozen snapshot grouped into `regular` and `stored` lists. Each list
has `length`, can be iterated with `for...of` or spread, and offers `first(predicate?)`. Every entry
has an `id`: native mints one for each regular method during setup, and stored methods keep their
API id.

```ts
const card = checkout.paymentMethods.regular.first((pm) => pm.type === 'scheme');
const storedCard = checkout.paymentMethods.stored.first();

if (card && (await checkout.isAvailable(card))) {
  const controller = await checkout.createController(card);
}
```

`isAvailable(pm)` resolves `false` when a payment method of this checkout cannot be created on the
current platform or pinned SDK. `isAvailable` and `createController` reject `invalidTarget` for a
payment method whose `id` is not part of this checkout's snapshot. Regular ids are minted per setup,
so a regular payment method taken from an older checkout is rejected. `createController` rejects `unsupportedCapability` for a payment method that
`isAvailable` reports as unavailable.

`createController(pm)` creates the native component eagerly and is idempotent: the same payment
method always resolves to the same `Controller`. `controller.requiresUserInteraction` is known
synchronously once the promise resolves.

## Embedded views

```tsx
<AdyenComponent controller={controller} />
```

`AdyenComponent` displays the controller's native UI. Mounting and unmounting neither create nor
dispose the controller, so a view can be remounted. One controller renders in at most one live view;
a second simultaneous view stays empty. Different controllers can mount at the same time, including
two payment methods of the same type where the platform supports both. The view renders nothing for
a controller that does not require user interaction.

Mounting is passive; the first checkout-level embedded payment callback acquires the operation slot.

## Session and advanced callbacks

Session callbacks use native-owned payment and details processing. Optional `onBeforeSubmit` returns
`BeforeSubmitResult.proceed(data)` or `.abort()`. Advanced `onSubmit` returns `SubmitResult.action`,
`.completed`, or `.retry`; `onAdditionalDetails` returns a completed result. Every suspended
callback is correlated to the active operation. Merchant throw, rejection, invalidation, replacement,
or host loss settles it through native cleanup.

One terminal callback, `onComplete` or `onError`, is delivered at most once. Terminal delivery
cleans the checkout and all its controllers. An abandoned flow uses `await checkout.invalidate()`.

## Headless submit and Drop-in

```ts
const controller = await checkout.createController(paymentMethod);
await controller.submit();
```

`controller.submit()` resolves once submission has started; the outcome arrives through the checkout
callbacks. A controller that requires user interaction and has no mounted view presents its UI in a
native sheet. Only one interactive operation is active. A competing `submit()` or Drop-in start
rejects `operationBusy`; it is not queued.

`await AdyenDropIn.start(checkout)` is asynchronous and identity-only. Android session Drop-in
launches through official v6 APIs. Android advanced Drop-in rejects `unsupportedCapability` before
launch. iOS Drop-in rejects `unsupportedCapability` without UI.

## Address lookup and standalone Action

iOS address lookup is a checkout-level operation. Search and selection are independently correlated
and cleanup removes lookup UI and pending work. Android lookup rejects `unsupportedCapability`.

Standalone `AdyenAction` owns an independent action operation. Overlap rejects `actionBusy`;
`hide()` cancels only Action-owned work. Android `RedirectAction` rejects
`unsupportedCapability` before setup or browser/UI presentation. It cannot mutate checkout state.
