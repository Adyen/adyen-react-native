# Feature support

This is the capability authority for the shipped v6-alpha runtime. A TypeScript type does not by
itself establish support. See [Architecture.md](./Architecture.md) for ownership and
[public-api-flows.md](./public-api-flows.md) for execution order.

| Presenter                     | Flow     | iOS                                    | Android                                |
| ----------------------------- | -------- | -------------------------------------- | -------------------------------------- |
| Embedded `AdyenComponent`     | Sessions | Supported, subject to available target | Supported, subject to available target |
| Embedded `AdyenComponent`     | Advanced | Supported, subject to available target | Supported, subject to available target |
| Headless `checkout.submit()`  | Sessions | Supported, subject to available target | Supported, subject to available target |
| Headless `checkout.submit()`  | Advanced | Supported, subject to available target | Supported, subject to available target |
| `AdyenDropIn.start(checkout)` | Sessions | `unsupportedCapability`, no UI         | Supported through official v6 Drop-in  |
| `AdyenDropIn.start(checkout)` | Advanced | `unsupportedCapability`, no UI         | `unsupportedCapability`, before launch |
| `AdyenAction.handle()`        | n/a      | Supported, one action owner            | Supported except `RedirectAction`      |
| `AdyenCSE`                    | n/a      | Supported                              | Supported                              |

## Platform-qualified capabilities

- **Android advanced Drop-in:** `6.0.0-alpha.1` lacks the completion callback needed for an
  advanced terminal result. The SDK rejects before it creates a presenter, request, launcher, or UI.
- **iOS Drop-in:** the pinned release does not expose a usable v6 integration for this separately
  built package. Start rejects before UI.
- **Address lookup:** iOS supports `card.addressVisibility: 'lookup'` when both address callbacks
  are configured. Android rejects that configuration with `unsupportedCapability`; it does not
  replace lookup with full or postal address UI.
- **Android standalone redirect Action:** rejects `unsupportedCapability` before native action setup
  because the published SDK does not expose a safe per-operation return-correlation hook. The
  opaque provider URL is not changed.
- **Apple Pay and Google Pay:** availability remains device and payment-method dependent. Apple Pay
  is iOS-only; Google Pay is Android-only.

## Deliberately absent

Partial payments, balance and order callbacks, stored-method removal, and deferred Drop-in
extensions are not shipped capabilities. Do not rely on historical declaration names or archived
guides for these features.
