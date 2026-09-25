# Public API flows

These flows describe public behavior. Internal identities are intentionally not exposed.

## Setup and replacement

```text
await setup(A) -> A active
await setup(B) -> dispose A -> create B -> B active
await setup(C fails) -> dispose B -> create C fails -> idle
```

Setup is serialized. A handle resolves only after native setup commits. Replacement disposes the old
checkout before the new factory runs. Failed replacement leaves idle. Commands from an older handle
reject `staleCheckout`.

## Targets and embedded views

Use `{ kind: 'paymentMethod', type }` for regular methods and
`{ kind: 'storedPaymentMethod', id }` for stored methods. Queries and `submit()` reject
`invalidTarget` for malformed, missing, unknown, or ambiguous targets. A known valid target that
is unavailable resolves `false` from `isAvailable`.

`AdyenComponent` registers one canonical target per native view. Distinct targets can mount at the
same time. A duplicate exact regular type or duplicate exact stored ID is rejected. Mounting is
passive; the first checkout-level embedded payment callback acquires the operation slot.

## Session and advanced callbacks

Session callbacks use native-owned payment and details processing. Optional `onBeforeSubmit` returns
`BeforeSubmitResult.proceed(data)` or `.abort()`. Advanced `onSubmit` returns `SubmitResult.action`,
`.completed`, or `.retry`; `onAdditionalDetails` returns a completed result. Every suspended
callback is correlated to the active operation. Merchant throw, rejection, invalidation, replacement,
or host loss settles it through native cleanup.

One terminal callback, `onComplete` or `onError`, is delivered at most once. Terminal delivery
cleans the checkout. An abandoned flow uses `await checkout.invalidate()`.

## Headless and Drop-in

`isAvailable`, `requiresUserInteraction`, and `submit` are asynchronous. Only one interactive
operation is active. A competing explicit headless or Drop-in action rejects `operationBusy`; it is
not queued.

`await AdyenDropIn.start(checkout)` is asynchronous and identity-only. Android session Drop-in
launches through official v6 APIs. Android advanced Drop-in rejects `unsupportedCapability` before
launch. iOS Drop-in rejects `unsupportedCapability` without UI.

## Address lookup and standalone Action

iOS address lookup is a checkout-level operation. Search and selection are independently correlated
and cleanup removes lookup UI and pending work. Android lookup rejects `unsupportedCapability`.

Standalone `AdyenAction` owns an independent action operation. Overlap rejects `actionBusy`;
`hide()` cancels only Action-owned work. Android `RedirectAction` rejects
`unsupportedCapability` before setup or browser/UI presentation. It cannot mutate checkout state.
