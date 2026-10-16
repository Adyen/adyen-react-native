# Error codes

Checkout commands reject structured errors with a stable `code` and `phase`:

```ts
type CheckoutErrorCode =
  | 'checkoutBusy'
  | 'operationBusy'
  | 'staleCheckout'
  | 'staleRequest'
  | 'unsupportedCapability'
  | 'invalidConfiguration'
  | 'invalidTarget'
  | 'cancelled';

type CheckoutErrorPhase =
  'setup' | 'query' | 'presentation' | 'callback' | 'cleanup';
```

Errors omit private checkout, controller, operation, and request identifiers. Do not inspect native
class names or depend on native SDK messages.

| Code                    | Meaning                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `checkoutBusy`          | A serialized checkout transition cannot start.                                           |
| `operationBusy`         | An interactive payment operation is already active. The contender is not queued.         |
| `staleCheckout`         | The handle or controller belongs to an invalidated, replaced, or terminal checkout.      |
| `staleRequest`          | A callback response does not match the live checkout, operation, request, and kind.      |
| `unsupportedCapability` | The current platform, flow, SDK version, or device cannot provide the requested feature. |
| `invalidConfiguration`  | Setup configuration is incomplete or invalid for the requested feature.                  |
| `invalidTarget`         | The payment method is missing or its `id` is not part of this checkout.                 |
| `cancelled`             | Native-owned cleanup cancelled the in-flight work.                                       |

Common examples:

- Calling a command on an old handle after setup replacement rejects `staleCheckout`.
- A concurrent `controller.submit()` or Drop-in start rejects `operationBusy`.
- A payment method of the checkout that cannot be used resolves `false` from `isAvailable`. It does
  not reject `invalidTarget`; `createController` for it rejects `unsupportedCapability`.
- Android advanced Drop-in, iOS Drop-in, Android address lookup, and Android standalone redirect
  Action reject `unsupportedCapability` before their unsupported UI starts.
- `card.addressVisibility: 'lookup'` without both address callbacks rejects
  `invalidConfiguration`.

Session and advanced terminal callbacks use `AdyenError` for the terminal error payload. Action and
CSE have their own promise results. Handle all public failures as asynchronous promise rejections.
