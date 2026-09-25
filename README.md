# Adyen React Native, v6 alpha

This alpha SDK provides native-owned checkout coordination for React Native. It requires React
Native 0.82 or newer and uses TurboModule-only runtime modules. It is not a production release.

## Install

```sh
yarn add @adyen/react-native
```

Run CocoaPods installation for iOS after installing the package. The library requires iOS 16.0 or
newer. It ships against official Adyen iOS and Android `6.0.0-alpha.1` dependencies; applications
do not pin those native SDKs themselves.

## Setup

```ts
const checkout = await AdyenCheckout.setup(session, configuration, {
  onComplete(result) {
    // terminal result
  },
  onError(error) {
    // terminal failure
  },
});
```

`Checkout` contains immutable `paymentMethods`, `flow`, and asynchronous
`isAvailable(target)`, `requiresUserInteraction(target)`, `submit(target)`, and `invalidate()`.
It does not expose configuration or native objects.

```tsx
const target = { kind: 'paymentMethod', type: 'scheme' } as const;
<AdyenComponent checkout={checkout} target={target} />;

await checkout.submit(target);
await checkout.invalidate();
```

Use `{ kind: 'storedPaymentMethod', id }` for a stored payment method. Old handles reject after
replacement or invalidation. One interactive operation runs at once; a competing start rejects
`operationBusy`.

## Drop-in

```ts
await AdyenDropIn.start(checkout);
```

Drop-in is a thin checkout façade. Android sessions are supported through official v6 APIs.
Android advanced Drop-in and iOS Drop-in return `unsupportedCapability` before UI. iOS address
lookup is supported when configured; Android address lookup is unsupported. Partial payments,
balance/order callbacks, and stored-method removal are absent.

## Documentation

- [Migration guide](docs/MigrationGuide.md)
- [Compatibility](docs/Compatibility.md)
- [Architecture](docs/Architecture.md)
- [Public API flows](docs/public-api-flows.md)
- [Configuration](docs/Configuration.md)
- [Error codes](docs/Error%20codes.md)
- [Feature support](docs/FeatureSupport.md)

## Development checks

```sh
yarn install --immutable
yarn lint
yarn typecheck
yarn test --runInBand
yarn prepare
yarn api-extractor
yarn validate:docs
```

`yarn validate:rn-fixtures --rn minimum --rn current` builds packed temporary consumers at React
Native 0.82.x and the repository's current React Native version.
