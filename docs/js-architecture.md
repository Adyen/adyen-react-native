# JavaScript architecture

The JavaScript layer is a thin façade over generated native modules. `src/checkout/AdyenCheckout.ts`
serializes setup, keeps handle metadata in a private `WeakMap`, and demultiplexes one generated
checkout event channel by private checkout identity. Replacing the active checkout marks the old
handle stale before the new setup reaches native code.

`paymentMethodsView.ts` builds the published `PaymentMethodsView` from the descriptor's
`paymentMethodsJson`. It rejects setup with `invalidConfiguration` unless every regular and stored
entry has a non-empty `id` that is unique across both groups. The payload is deep-frozen, and the
`regular` and `stored` lists are frozen objects with `length`, iteration, and `first(predicate?)`.

`createCheckout.ts` publishes only portable `Checkout` data and methods. It indexes the snapshot by
`id`. `isAvailable` and `createController` look up the payment method's `id` first: a stale handle
rejects `staleCheckout`, and a payment method that is not in the snapshot rejects `invalidTarget`.
Only then does the command reach native code. `createController` caches the in-flight or resolved
promise per payment method id, so the same payment method returns the same `Controller` instance;
a failed creation is evicted so a later call can retry.

`createController.ts` wraps the native `{controllerId, requiresUserInteraction}` descriptor in a
frozen public `Controller` and keeps the native identities in a private `WeakMap` handle, the same
privacy pattern used for checkout handles. `controller.submit()` rejects `staleCheckout` without a
bridge call once its checkout is stale, and otherwise calls `submitController`.

`AdyenComponent` resolves the private controller handle and passes only `checkoutId` and
`controllerId` to the Fabric view. It renders nothing for a value that did not come from a checkout
or for a controller whose `requiresUserInteraction` is `false`. It keeps no module-level controller,
callback, or native resource registry.

`AdyenDropIn.start(checkout)` obtains the private handle metadata and calls the generated Checkout
TurboModule with that identity only. It has no Drop-in-specific listener stack, configuration, or
payment-method reconstruction.

Merchant callback results are validated and returned to native with the original checkout,
operation, request, and event kind. Callback throw/rejection sends deterministic cancellation
instead of leaving native suspended. Native rejections map to the public `CheckoutError` codes in
`errors.ts` without exposing native identities or messages.
