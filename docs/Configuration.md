# Configuration

## Root configurations
* **environment** - Use `test`. When you are ready to go live, change the value to one of our [live environments](https://docs.adyen.com/online-payments/drop-in-web#testing-your-integration).
* **clientKey** - A public key linked to your API credential, used for [client-side authentication](https://docs.adyen.com/development-resources/client-side-authentication).
* **amount** - Amount to be displayed on the Pay Button. It expects an object with the minor units value and currency properties. For example, `{ value: 1000, currency: 'USD' }` is **10$**. For card pre-authorisation set amount to `0` (zero).
* **countryCode** - The shopper's country code in ISO 3166-1 alpha-2 format. Example: `"NL"` or `"US"`. 
* **shopperLocale** - 🚧 Work in progress. In current version this property only localises payment methods names. Default OS's locale is used for localisation.
* **returnUrl** - For iOS, this is the URL to your app, where the shopper should return, after a redirection. Maximum of 1024 characters. For more information on setting a custom URL scheme for your app, read the [Apple Developer documentation](https://developer.apple.com/documentation/uikit/inter-process_communication/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app).
For Android, this value is automatically overridden by `AdyenCheckout`.

> ⚠️ To show the amount on the **Pay** button both *amount* and *countryCode* must be set.

## React Native SDK provides following configurations for components:

### DropIn component
* **showPreselectedStoredPaymentMethod** - Determines whether to enable preselected stored payment method view step. Defaults to `true`.
* **skipListWhenSinglePaymentMethod** - Determines whether to enable skipping payment list step when there is only one non-instant payment method. Defaults to `false`.

### Card component
* **showStorePaymentField** - Indicates if the field for storing the card payment method should be displayed in the form. Defaults to true.
* **holderNameRequired** - Indicates if the field for entering the holder name should be displayed in the form. Defaults to false.
* **hideCvcStoredCard** - Indicates whether to show the security code field on a stored card payment. Defaults to false.
* **hideCvc** - Indicates whether to show the security code field at all. Defaults to false.
* **addressVisibility** - Indicates the display mode of the billing address form. Options: `"none"`, `"postal"`, `"full"`. Defaults to `"none"`.
* **kcpVisibility** - Indicates whether to show the security fields for South Korea issued cards. Options: `"show"` or `"hide"`. Defaults to `"hide"`.
* **socialSecurity** - Indicates the visibility mode for the social security number field (CPF/CNPJ) for Brazilian cards. Options: "show" or `"hide"`. Defaults to `"hide"`.
* **supported** - The list of allowed card types. By default uses list of `brands` from payment method. Fallbacks to list of all known cards.

### ApplePay component
* **merchantID** - The merchant identifier for apple pay.
* **merchantName** - The merchant name. Used for generation of collection of `PKPaymentSummaryItem`.
* **allowOnboarding** - The flag to toggle onboarding. If `true`, allow the shopper to add cards to Apple Pay if non exists yet. If `false`, Apple Pay is disabled when the shopper doesn’t have supported cards on Apple Pay wallet. Default is `false`.

### GooglePay component
* **merchantAccount** - The merchant account to be put in the payment token from Google to Adyen. By default uses value from `brands`
* **allowedCardNetworks** - One or more card networks that you support, also supported by the Google Pay API.
* **allowedAuthMethods** - Fields supported to authenticate a card transaction.
* **totalPriceStatus** - The status of the total price used. Defaults to `"FINAL"`.
* **allowPrepaidCards** - Set to `false` if you don't support prepaid cards. Default: The prepaid card class is supported for the card networks specified.
* **billingAddressRequired** - Set to `true` if you require a billing address. A billing address should only be requested if it's required to process the transaction.
* **emailRequired** - Set to `true` to request an email address.
* **shippingAddressRequired** - Set to `true` to request a full shipping address.
* **existingPaymentMethodRequired** - If set to `true` then the **IsReadyToPayResponse** object includes an additional paymentMethodPresent property that describes the visitor's readiness to pay with one or more payment methods specified in **allowedPaymentMethods**.
* **googlePayEnvironment** - The environment to be used by GooglePay. Should be either `WalletConstants.ENVIRONMENT_TEST` or `WalletConstants.ENVIRONMENT_PRODUCTION`. By default is using **environment** from root.

## Example

```js
{
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  shopperLocale: 'nl-NL',
  amount: {
    currency: 'EUR',
    value: 1000,
  },
  returnUrl: 'myapp://',
  dropin: {
    skipListWhenSinglePaymentMethod: true,
    showPreselectedStoredPaymentMethod: false,
  },
  card: {
    holderNameRequired: true,
    addressVisibility: 'postalCode',
    showStorePaymentField : false,
    hideCvcStoredCard: true,
    hideCvc: true,
  },
  applepay: {
    merchantID: '{YOUR_APPLE_MERCHANT_ID}', 
    merchantName: '{YOUR_MERCHANT_NAME}',
    allowOnboarding: true,
  },
  googlepay: {
    merchantAccount: '{YOUR_GOOGLE_MERCHANT_ID}',
    allowedCardNetworks: ['AMEX', 'MASTERCARD', 'VISA'],
    allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
    totalPriceStatus: 'FINAL',
  }
}
```
