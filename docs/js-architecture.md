# JavaScript architecture

The JavaScript layer is a thin façade over generated native modules. `src/checkout/AdyenCheckout.ts`
serializes setup, keeps handle metadata in a private `WeakMap`, and demultiplexes one generated
checkout event channel by private checkout identity.

`createCheckout.ts` publishes only portable `Checkout` data and methods. It validates
`CheckoutTarget`, snapshots payment methods immutably, rejects stale or invalid commands
asynchronously, and never exposes native resources or configuration.

`AdyenComponent` creates a private presenter identity for its Fabric registration. It sends checkout
identity, presenter identity, target kind, and target value to native. It does not keep a
module-level presenter, callback, or native resource registry.

`AdyenDropIn.start(checkout)` obtains the private handle metadata and calls the generated Checkout
TurboModule with that identity only. It has no Drop-in-specific listener stack, configuration, or
payment-method reconstruction.

Merchant callback results are validated and returned to native with the original checkout,
operation, request, and event kind. Callback throw/rejection sends deterministic cancellation
instead of leaving native suspended.
