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

Errors omit private checkout, operation, presenter, and request identifiers. Do not inspect native
class names or depend on native SDK messages.

| Code                    | Meaning                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `checkoutBusy`          | A serialized checkout transition cannot start.                                           |
| `operationBusy`         | An interactive payment operation is already active. The contender is not queued.         |
| `staleCheckout`         | The handle belongs to an invalidated, replaced, or terminal checkout.                    |
| `staleRequest`          | A callback response does not match the live checkout, operation, request, and kind.      |
| `unsupportedCapability` | The current platform, flow, SDK version, or device cannot provide the requested feature. |
| `invalidConfiguration`  | Setup configuration is incomplete or invalid for the requested feature.                  |
| `invalidTarget`         | A target is malformed, missing, unavailable, or ambiguous.                               |
| `cancelled`             | Native-owned cleanup cancelled the in-flight work.                                       |

Common examples:

- Calling a command on an old handle after setup replacement rejects `staleCheckout`.
- A concurrent headless submit or Drop-in start rejects `operationBusy`.
- Android advanced Drop-in, iOS Drop-in, Android address lookup, and Android standalone redirect
  Action reject `unsupportedCapability` before their unsupported UI starts.
- `card.addressVisibility: 'lookup'` without both address callbacks rejects
  `invalidConfiguration`.

Session and advanced terminal callbacks use `AdyenError` for the terminal error payload. Action and
CSE have their own promise results. Handle all public failures as asynchronous promise rejections.
