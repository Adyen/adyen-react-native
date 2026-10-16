# Migration guide

This guide covers the v6-alpha static API. It requires React Native 0.82 or newer and
TurboModule-only runtime modules. Historical provider, hook, per-method-view, and bridge guides
are not integration instructions.

## Create an identity-bound checkout

Replace provider and hook setup with an awaited static setup call. The returned handle has no
`configuration` field.

```ts
const checkout = await AdyenCheckout.setup(session, configuration, {
  onComplete(result) {
    // terminal session result
  },
  onError(error) {
    // terminal failure
  },
  async onBeforeSubmit(data) {
    return BeforeSubmitResult.proceed(data);
  },
});
```

For advanced flow, use `setupAdvanced(paymentMethods, configuration, callbacks)`. `onSubmit`
returns `SubmitResult.action`, `.completed`, or `.retry`; `onAdditionalDetails` returns
`AdditionalDetailsResult.completed`.

## Pick payment methods from the checkout

`checkout.paymentMethods` is no longer the raw `PaymentMethodsResponse`. It is a frozen view with
`regular` and `stored` lists. Every entry carries an `id`: regular methods receive one generated
during setup, and stored methods keep their API id. Always pass the entries from these lists back
to the checkout; do not build payment method objects by hand.

Before:

```ts
const methods = checkout.paymentMethods.paymentMethods;
const stored = checkout.paymentMethods.storedPaymentMethods ?? [];
```

After:

```ts
for (const paymentMethod of checkout.paymentMethods.regular) {
  // render a row for paymentMethod.name
}
const card = checkout.paymentMethods.regular.first((pm) => pm.type === 'scheme');
const storedCard = checkout.paymentMethods.stored.first();
const count = checkout.paymentMethods.regular.length;
```

## Replace targets with controllers

`CheckoutTarget` and the target-based `checkout.isAvailable(target)`,
`checkout.requiresUserInteraction(target)`, and `checkout.submit(target)` are removed. So are the
`checkout`, `target`, and `type` props of `AdyenComponent`. Create a controller for a payment
method instead and use it for both embedded and headless flows.

Before:

```tsx
const card = { kind: 'paymentMethod', type: 'scheme' } as const;

if (await checkout.isAvailable(card)) {
  if (await checkout.requiresUserInteraction(card)) {
    return <AdyenComponent checkout={checkout} target={card} />;
  }
  await checkout.submit(card);
}
```

After:

```tsx
const card = checkout.paymentMethods.regular.first((pm) => pm.type === 'scheme');

if (card && (await checkout.isAvailable(card))) {
  const controller = await checkout.createController(card);
  if (controller.requiresUserInteraction) {
    return <AdyenComponent controller={controller} />;
  }
  await controller.submit();
}
```

Stored methods work the same way:

```tsx
const storedCard = checkout.paymentMethods.stored.first(
  (pm) => pm.id === 'stored-card-id'
);
if (storedCard) {
  const controller = await checkout.createController(storedCard);
  return <AdyenComponent controller={controller} />;
}
```

Behavior to keep in mind:

- `createController` returns the same `Controller` for the same payment method, so it is safe to
  call from render effects.
- `requiresUserInteraction` is a synchronous property, not a promise.
- Mounting or unmounting `AdyenComponent` does not create or dispose the controller. One controller
  displays in one view at a time.
- Controllers have no `dispose()`. They are released with their checkout.
- `isAvailable` resolves `false` for a payment method that cannot be used on this device or pinned
  SDK, and `createController` then rejects `unsupportedCapability`. Payment methods that are not
  part of the checkout reject `invalidTarget`.
- Several payment methods of the same type are distinct entries with distinct ids. With the pinned
  `6.0.0-alpha.1` SDKs, only the first instance of a regular type can be created; later instances
  report `isAvailable === false`.

The `SubmitModel`, `AdvancedPayment`, and `ConditionalPaymentComponent` exports are also removed.

## Lifecycle and contention

A new setup replacement disposes the old checkout and its controllers before creating the new one.
Old handles and controllers reject `staleCheckout`. If a replacement fails, the failed replacement
leaves idle instead of restoring the old checkout. Await setup calls and retain only the latest
resolved handle, and create new controllers from it.

Only one interactive operation can run. A competing `controller.submit()` or Drop-in start rejects
`operationBusy` and never starts later. Call `await checkout.invalidate()` when abandoning a flow.
It is asynchronous, idempotent, and makes the handle and its controllers stale.

## Drop-in and platform differences

The only Drop-in method is:

```ts
await AdyenDropIn.start(checkout);
```

It passes only the internal checkout identity to native. Android session Drop-in is supported by
the official v6 API. Android advanced Drop-in rejects `unsupportedCapability` before launch on the
pinned SDK. iOS Drop-in also rejects `unsupportedCapability` without UI.

iOS supports configured card address lookup. Android lookup rejects `unsupportedCapability`.
Standalone Android `RedirectAction` is also unsupported; supported non-redirect standalone Action
kinds remain independent from the checkout.

Partial payments, balance/order callbacks, and stored-method removal are absent. See
[Architecture.md](./Architecture.md#capabilities) for current platform support and
[Compatibility.md](./Compatibility.md) for consumer requirements.
