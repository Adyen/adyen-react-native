# Architecture

`@adyen/react-native` v6 alpha uses a native-owned checkout coordinator. JavaScript is a
small, typed façade. Native code owns Checkout SDK objects, presenters, suspended callbacks,
redirect registration, and cleanup.

## Public boundary

The generated public report at `etc/api/adyen-react-native.api.md` is authoritative. The portable
checkout surface is:

```ts
type CheckoutTarget =
  | { kind: 'paymentMethod'; type: string }
  | { kind: 'storedPaymentMethod'; id: string };

interface Checkout {
  readonly flow: 'sessions' | 'advanced';
  readonly paymentMethods: PaymentMethodsResponse;
  isAvailable(target: CheckoutTarget): Promise<boolean>;
  requiresUserInteraction(target: CheckoutTarget): Promise<boolean>;
  submit(target: CheckoutTarget): Promise<void>;
  invalidate(): Promise<void>;
}
```

`Checkout` deliberately has no public configuration, native object, callback continuation, or
identity field. The handle's internal checkout identity is passed only to generated native
commands. `paymentMethods` is an immutable setup snapshot.

`AdyenComponent` accepts a checkout and a `CheckoutTarget`. Its `type` prop is a temporary regular
payment-method shorthand. New integrations should use `target`, especially for stored methods,
which must retain their exact stored ID.

## Lifecycle

There is one active checkout. Setup transitions are serialized:

```text
active -> dispose old checkout -> idle -> create candidate -> active | idle
```

A replacement disposes the old checkout before native creation of the replacement begins. All old
handles become stale immediately. If setup fails, the failed replacement leaves idle; the old
checkout is never restored. A stale command rejects with `staleCheckout`.

Native permits one interactive payment operation at a time across embedded, headless, and Drop-in
entry points. Explicit competing headless or Drop-in starts reject immediately with
`operationBusy`; they are never queued. A checkout terminal result, explicit `invalidate()`,
replacement, and host loss converge on native cleanup.

`invalidate()` is asynchronous and idempotent. It first makes its handle stale, then resolves after
native resources, pending callbacks, owned UI, and event production are released.

## Generated bridge and Fabric

Checkout, standalone Action, and CSE are generated TurboModules. The embedded component is a Fabric
view. Runtime modules are TurboModule-only, so integrations require React Native 0.82 or newer.

The coordinator event channel carries private checkout, operation, and request identities plus a
typed event kind. Evolving payment payloads use an explicit JSON boundary. JavaScript dispatches
events only to their owning handle and returns responses only when every identity and kind matches.
Private identifiers never appear in merchant-visible API values or errors.

An embedded registration has a checkout identity, a lifecycle identity, and a canonical target key.
Regular targets use exact payment-method type; stored targets use exact stored ID. Distinct keys can
mount passively. A duplicate key rejects without replacing the first registration.

## Capabilities

`AdyenDropIn.start(checkout)` is an identity-only asynchronous façade. Android session Drop-in uses
the official v6 API. Android advanced Drop-in rejects with `unsupportedCapability` before launch on
the pinned `6.0.0-alpha.1` SDK because that release lacks the completion callback needed to return a
terminal result. iOS Drop-in also rejects with `unsupportedCapability` before presenting UI.

iOS supports configured card address lookup. Android rejects address lookup with
`unsupportedCapability` on the pinned SDK and does not show a fallback address UI. Partial payments,
balance/order operations, and stored-method removal are absent from the shipped public surface.

For platform detail see [native-architecture.md](./native-architecture.md), chronological behavior
see [public-api-flows.md](./public-api-flows.md), and compatibility requirements see
[Compatibility.md](./Compatibility.md).
