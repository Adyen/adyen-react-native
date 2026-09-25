# Migration guide

This guide covers the v6-alpha static API. It requires React Native 0.82 or newer and
TurboModule-only runtime modules. Historical provider, hook, per-method-view, and bridge guides
under `docs/archive/` are not integration instructions.

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

## Target payment methods explicitly

Use discriminated targets for query, headless submit, and embedded views:

```tsx
const card = { kind: 'paymentMethod', type: 'scheme' } as const;
const storedCard = {
  kind: 'storedPaymentMethod',
  id: 'stored-card-id',
} as const;

await checkout.isAvailable(card);
await checkout.submit(card);
<AdyenComponent checkout={checkout} target={storedCard} />;
```

The `type` prop remains a shorthand for regular methods only. Stored methods must use their exact
ID. Empty, unknown, malformed, or ambiguous targets reject `invalidTarget`.

## Lifecycle and contention

A new setup replacement disposes the old checkout before creating the new one. Old handles reject
`staleCheckout`. If a replacement fails, the failed replacement leaves idle instead of restoring the
old checkout. Await setup calls and retain only the latest resolved handle.

Only one interactive operation can run. A competing explicit headless submit or Drop-in start
rejects `operationBusy` and never starts later. Call `await checkout.invalidate()` when abandoning a
flow. It is asynchronous, idempotent, and makes the handle stale.

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

Partial payments, balance/order callbacks, and stored-method removal are absent. Consult
[FeatureSupport.md](./FeatureSupport.md) for current platform support and
[Compatibility.md](./Compatibility.md) for consumer requirements.
