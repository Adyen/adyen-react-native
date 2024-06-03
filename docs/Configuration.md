# Configuration

## Root configurations

- `environment` - Use **test**. When you are ready to go live, change the value to one of our [live environments](https://docs.adyen.com/online-payments/drop-in-web#testing-your-integration).
- `clientKey` - A public key linked to your API credential, used for [client-side authentication](https://docs.adyen.com/development-resources/client-side-authentication).
- `amount` - Amount to be displayed on the Pay Button. It expects an object with a minor units value and currency properties. For example, `{ value: 1000, currency: 'USD' }` is **10$**. For card pre-authorisation set the amount to **0** (zero).
- `countryCode` - The shopper's country code in ISO 3166-1 alpha-2 format. Example: **NL** or **US**.
- `shopperLocale` - 🚧 Work in progress. In the current version, this property only localizes payment method names. The default OS's locale is used for localization.
- `returnUrl` - For iOS, this is the URL to your app, where the shopper should return, after a redirection. Maximum of 1024 characters. For more information on setting a custom URL scheme for your app, read the [Apple Developer documentation](https://developer.apple.com/documentation/uikit/inter-process_communication/allowing_apps_and_websites_to_link_to_your_content/defining_a_custom_url_scheme_for_your_app).
  For Android, this value is automatically overridden by `AdyenCheckout`.

> ⚠️ To show the amount on the **Pay** button both _amount_ and _countryCode_ must be set.

## Analytics

- `enabled` - Enable/Disable all analytics. Defaults to **true**. ⚠️ This feature only available from v68 of Adyen API.
- `verboseLogs` - Enable extensive logs from SDK. Helpful during debugging. Defaults to **false**.

## React Native SDK provides the following configurations for components:

### Drop-in

- `showPreselectedStoredPaymentMethod` - Determines whether to enable the preselected stored payment method view step. Defaults to **true**.
- `skipListWhenSinglePaymentMethod` - If set to **true** allow to skip payment methods list step when there is only one non-instant payment method. Defaults to **false**.
- `title` - Set custom title for preselected stored payment method view Drop-in on iOS. By default app's name used. This property have no effect on Android.

### Card component

- `addressVisibility` - Indicates the display mode of the billing address form. Options: **"none"**, **"postal"**, **"full"**. Defaults to **"none"**.
- `allowedAddressCountryCodes` - List of ISO 3166-1 alpha-2 country code values to control country picker options in full address form.
- `hideCvc` - Indicates whether to show the security code field at all. Defaults to false.
- `hideCvcStoredCard` - Indicates whether to show the security code field on a stored card payment. Defaults to false.
- `holderNameRequired` - Indicates if the field for entering the holder name should be displayed in the form. Defaults to **false**.
- `kcpVisibility` - Indicates whether to show the security fields for South Korea-issued cards. Options: **"show"** or **"hide"**. Defaults to **"hide"**.
- `showStorePaymentField` - Indicates if the field for storing the card payment method should be displayed in the form. Defaults to **true**.
- `socialSecurity` - Indicates the visibility mode for the social security number field (CPF/CNPJ) for Brazilian cards. Options: "show" or **"hide"**. Defaults to **"hide"**.
- `supported` - The list of allowed card types. By default, uses a list of `brands` from the payment method. Fallbacks to list of all known cards.

### 3D Security 2

- **requestorAppUrl** - Alternative `returnURL` value that could be used for 3D Security 2 OOB flow. Always use a [Universal Link](https://developer.apple.com/ios/universal-links/) aka [App Link](https://developer.android.com/training/app-links#android-app-links).


### ApplePay component

- `merchantID` - The [Merchant ID](https://developer.apple.com/library/archive/ApplePay_Guide/Configuration.html) for Apple Pay.
- `merchantName` - The merchant name. This value will be used to generate a single _PKPaymentSummaryItem_ if `summaryItems` is not provided.
- `allowOnboarding` - The flag to toggle onboarding. If **true**, allow the shopper to add cards to Apple Pay if none exist yet or none is applicable. If **false**, Apple Pay is disabled when the shopper doesn’t have supported cards on the Apple Pay wallet. The default is **false**.
- `summaryItems` - An array of [payment summary item](https://developer.apple.com/documentation/passkit/pkpaymentrequest/1619231-paymentsummaryitems) objects that summarize the amount of the payment. The last element of this array must contain the same value as `amount` on the Checkout `\payments` API request. **WARNING**: Adyen uses integer minor units, whereas Apple uses `NSDecimalNumber`.
- `requiredShippingContactFields` - A list of fields that you need for a shipping contact in order to process the transaction. The list is empty by default.
- `requiredBillingContactFields` - A list of fields that you need for a billing contact in order to process the transaction. The list is empty by default.
- `billingContact` - Billing contact information for the user. Corresponds to [ApplePayPaymentContact](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentcontact).
- `shippingContact` -  Shipping contact information for the user. Corresponds to [ApplePayPaymentContact](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentcontact).
- `shippingType` - Indicates the display mode for the shipping (e.g. "Pick Up", "Ship To", "Deliver To"). Localized. The default is **shipping**. Corresponds to [PKShippingType](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentrequest/1916128-shippingtype).
- `supportedCountries` - A list of two-letter country codes for limiting payment to cards from specific countries or regions. When provided will filter the selectable payment passes to those issued in the supported countries.
- `shippingMethods` - The list of shipping methods available for a payment request. Corresponds to [ApplePayShippingMethod](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentrequest/1916121-shippingmethods). 

### GooglePay component

- `merchantAccount` - The merchant account to be put in the payment token from Google to Adyen. By default uses value from `brands`.
- `allowedCardNetworks` - One or more card networks that you support, also supported by the Google Pay API.
- `allowedAuthMethods` - Fields supported to authenticate a card transaction.
- `totalPriceStatus` - The status of the total price used. Defaults to **"FINAL"**.
- `allowPrepaidCards` - Set to **false** if you don't support prepaid cards. Default: The prepaid card class is supported for the card networks specified.
- `allowCreditCards` - Set to **false** if you don't support credit cards. Default: The credit card class is supported for the card networks specified.
- `billingAddressRequired` - Set to **true** if you require a billing address. A billing address should only be requested if it's required to process the transaction.
- `billingAddressParameters` - Set billing address parameters:

  - `format` - Billing address format required to complete the transaction.
    
    Possible values:
      MIN *(default)*: Name, country code, and postal code.
      FULL: Name, street address, locality, region, country code, and postal code.

  - `phoneNumberRequired` - Set to true if a phone number is required for the provided shipping address.

- `emailRequired` - Set to **true** to request an email address.
- `shippingAddressRequired` - Set to **true** to request a full shipping address.
- `shippingAddressParameters` - Set shipping address parameters.

  - `allowedCountryCodes` - List of ISO 3166-1 alpha-2 country code values of the countries where shipping is allowed. If this object isn't specified, all shipping address countries are allowed.
  - `phoneNumberRequired` - Set to true if a phone number is required for the provided shipping address.

- `existingPaymentMethodRequired` - If set to **true** then the `isReadyToPayResponse` object includes an additional paymentMethodPresent property that describes the visitor's readiness to pay with one or more payment methods specified in **allowedPaymentMethods**.
- `googlePayEnvironment` - The environment to be used by GooglePay. Should be either **WalletConstants.ENVIRONMENT_TEST** or **WalletConstants.ENVIRONMENT_PRODUCTION**. By default uses `environment` from the root.

## Example

```js
const configuration = {
  environment: 'test',
  clientKey: '{YOUR_CLIENT_KEY}',
  countryCode: 'NL',
  amount: {
    currency: 'EUR',
    value: 9800,
  },
  returnUrl: 'myapp://adyencheckout',
  analytics: {
    enabled: true,
    verboseLogs: true,
  },
  dropin: {
    skipListWhenSinglePaymentMethod: true,
    showPreselectedStoredPaymentMethod: false,
  },
  card: {
    holderNameRequired: true,
    addressVisibility: 'postalCode',
    showStorePaymentField: false,
    hideCvcStoredCard: true,
    hideCvc: true,
    allowedAddressCountryCodes: ['US', 'UK', 'CA', 'NL'],
  },
  threeDS2: {
    requestorAppUrl: 'https://YOUR_UNIVERSAL_APP_LINK.com/',
  },
  applepay: {
    merchantID: '{YOUR_APPLE_MERCHANT_ID}',
    allowOnboarding: true,
    summaryItems: [
      {
        label: 'Item',
        amount: 100,
        type: 'pending',
      },
      {
        label: 'Discount',
        amount: -20.4,
        type: 'final',
      },
      {
        label: 'Tax',
        amount: '18.4',
      },
      {
        label: `{YOUR_MERCHANT_NAME}`,
        amount: '98',
      },
    ],
    billingContact: {
      phoneNumber: '123-456-7890',
      emailAddress: 'example@email.com',
      givenName: 'John',
      familyName: 'Doe',
      phoneticGivenName: 'John',
      phoneticFamilyName: 'Doe',
      addressLines: ['123 Main St', 'Apt 4B'],
      subLocality: 'Suburb',
      locality: 'City',
      postalCode: '12345',
      subAdministrativeArea: 'County',
      administrativeArea: 'State',
      country: 'Country',
      countryCode: 'US',
    },
    shippingContact: {
      phoneNumber: '123-456-7890',
      emailAddress: 'example@email.com',
      givenName: 'John',
      familyName: 'Doe',
      phoneticGivenName: 'John',
      phoneticFamilyName: 'Doe',
      addressLines: ['123 Main St', 'Apt 4B'],
      subLocality: 'Suburb',
      locality: 'City',
      postalCode: '12345',
      subAdministrativeArea: 'County',
      administrativeArea: 'State',
      country: 'Country',
      countryCode: 'US',
    },
    shippingType: 'storePickup',
    supportedCountries: ['US', 'UK', 'CA', 'NL'],
    shippingMethods: [
      {
        label: "Free Shipping",
        detail: "Arrives in 5 to 7 days",
        amount: "0.00",
        identifier: "FreeShip",
      },
      {
        label: "Super Shipping",
        detail: "Arrives super fast",
        amount: "10.00",
        identifier: "SuperShip",
        startDate: "2022-02-01",
        endDate: "2022-02-10"
      },
    ],
    requiredBillingContactFields: ['phoneticName', 'postalAddress'],
    requiredShippingContactFields: ['name', 'phone', 'email', 'postalAddress'],
  },
  googlepay: {
    allowCreditCards: false,
    allowPrepaidCards: false,
    billingAddressRequired: true,
    billingAddressParameters: {
      format: 'FULL',
      phoneNumberRequired: true,
    },
    shippingAddressRequired: true,
    shippingAddressParameters: {
      allowedCountryCodes: ['US', 'UK', 'CA', 'NL'],
      phoneNumberRequired: true,
    },
    emailRequired: true,
  },
};

```
