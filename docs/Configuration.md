# Configuration

Pass `Configuration` to `AdyenCheckout.setup()` or `AdyenCheckout.setupAdvanced()`. It is an input
to setup, not a property on the returned `Checkout`.

```ts
const configuration = {
  environment: 'test',
  clientKey: '{CLIENT_KEY}',
  returnUrl: 'myapp://payment',
  countryCode: 'NL',
  amount: { currency: 'EUR', value: 1000 },
};
```

`clientKey` and `returnUrl` are required. `amount` and `countryCode` must be supplied together when
the selected payment method requires them.

## Card address lookup

To request iOS lookup, set `addressVisibility: 'lookup'` and provide both callbacks:

```ts
const configuration = {
  environment: 'test',
  clientKey: '{CLIENT_KEY}',
  returnUrl: 'myapp://payment',
  card: {
    addressVisibility: 'lookup',
    onUpdateAddress(prompt, lookup) {
      lookup.update([{ id: prompt, address: { city: 'Amsterdam' } }]);
    },
    onConfirmAddress(address, lookup) {
      lookup.confirm(address);
    },
  },
};
```

Missing callbacks reject setup with `invalidConfiguration`. On Android, lookup rejects
`unsupportedCapability` with no address fallback UI. Other card configuration and Apple Pay /
Google Pay options are defined by the generated public API report; check
[FeatureSupport.md](./FeatureSupport.md) before depending on a platform-specific option.

Drop-in-specific configuration, partial-payment configuration, balance/order callbacks, and
stored-method-removal options are not supported by this release.
