# Configuration

## Root configurations

| Parameter       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Required                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `environment`   | Current Adyen API. Use **test** for debugging. When you are ready to go live, change the value to one of our [live environments](https://docs.adyen.com/online-payments/drop-in-web#testing-your-integration).                                                                                                                                                                                                                                                                                                                                                                 | Yes                                                                      |
| `clientKey`     | A public key linked to your API credentials, used for [client-side authentication](https://docs.adyen.com/development-resources/client-side-authentication).                                                                                                                                                                                                                                                                                                                                                                                                                   | Yes                                                                      |
| `amount`        | Amount to be displayed on the "Pay" Button. It expects an object with a minor units value and currency properties. For example, `{ value: 1000, currency: 'USD' }` is **$10**. For card pre-authorisation set the amount to **0** (zero).                                                                                                                                                                                                                                                                                                                                      | For `ApplePay` and `GooglePay`. Must be used together with `countryCode` |
| `countryCode`   | The shopper's country code in ISO 3166-1 alpha-2 format. Example: **NL** or **US**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | For `ApplePay` and `GooglePay`. Must be used together with `amount`      |
| `shopperLocale` | In the current version, this property only localizes payment method names. The default OS's locale is used for localization.                                                                                                                                                                                                                                                                                                                                                                                                                                                   | No                                                                       |
| `returnUrl`     | Url where the shopper should return after a payment is completed. Can use [Universal Links](https://developer.apple.com/ios/universal-links/)/[App Links](https://developer.android.com/training/app-links) or Custom URL Schemes. Maximum of 1024 characters.<br><br> - For **iOS**, any means of redirect can be used.<br><br> - For **Android Components**, any means of redirect can be used.<br><br> - For **Android Drop-in**, this value is automatically overridden by `AdyenCheckout`. Also, `await AdyenDropIn.getReturnURL()` can be used to extract a `returnUrl`. | Yes                                                                      |

> [!IMPORTANT]
> To show the amount on the **Pay** button both _amount_ and _countryCode_ must be set.

## Analytics

| Parameter     | Description                                                                                                  | Required |
| ------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| `enabled`     | Enable/Disable all analytics. Defaults to **true**. ⚠️ This feature is only available from v68 of Adyen API. | No       |
| `verboseLogs` | Enable extensive logs from SDK. Helpful during debugging. Defaults to **false**.                             | No       |

## React Native SDK provides the following configurations for components:

### Drop-in

| Parameter                            | Description                                                                                                                                                                                                                                                                                                                                                                                                                        | Required |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `showRemovePaymentMethodButton`      | Enables UI that allows the shopper to remove stored payment methods. Defaults to **false**. For `\sessions` this option works out of the box. For `\payment` (aka "Advanced flow") one must implement `onDisableStoredPaymentMethod?(storedPaymentMethod: StoredPaymentMethod, resolve: () => void, reject: () => void)` callback and call [/disable](https://docs.adyen.com/api-explorer/Recurring/68/post/disable) API endpoint. | No       |
| `showPreselectedStoredPaymentMethod` | Determines whether to enable the preselected stored payment method view step. Defaults to **true**.                                                                                                                                                                                                                                                                                                                                | No       |
| `skipListWhenSinglePaymentMethod`    | If set to **true** allow to skip payment methods list step when there is only one non-instant payment method. Defaults to **false**.                                                                                                                                                                                                                                                                                               | No       |
| `title`                              | Set custom title for preselected stored payment method view Drop-in on iOS. By default app's name is used. This property has no effect on Android.                                                                                                                                                                                                                                                                                 | No       |

### Card component

| Parameter                                   | Description                                                                                                                                               | Required |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `addressVisibility`                         | Indicates the display mode of the billing address form. Options: **"none"**, **"postal"**, **"full"**, **"lookup"**. Defaults to **"none"**.              | No       |
| `allowedAddressCountryCodes`                | List of ISO 3166-1 alpha-2 country code values to control country picker options in full address form.                                                    | No       |
| `hideCvc`                                   | Indicates whether to show the security code field at all. Defaults to **false**.                                                                          | No       |
| `hideCvcStoredCard`                         | Indicates whether to show the security code field on a stored card payment. Defaults to **false**.                                                        | No       |
| `holderNameRequired`                        | Indicates if the field for entering the holder name should be displayed in the form. Defaults to **false**.                                               | No       |
| `kcpVisibility`                             | Indicates whether to show the security fields for South Korea-issued cards. Options: **"show"** or **"hide"**. Defaults to **"hide"**.                    | No       |
| `showStorePaymentField`                     | Indicates if the field for storing the card payment method should be displayed in the form. Defaults to **true**.                                         | No       |
| `socialSecurity`                            | Indicates the visibility mode for the social security number field (CPF/CNPJ) for Brazilian cards. Options: "show" or **"hide"**. Defaults to **"hide"**. | No       |
| `supported`                                 | The list of allowed card types. By default, a list of `brands` from the payment method is used. Fallbacks to list of all known cards.                     | No       |
| `onUpdateAddress: (prompt, lookup) => {}`   | The callback to provide `lookup` results for shopper-selected `prompt`. Used when `addressVisibility` is set to **lookup**                                | No       |
| `onConfirmAddress: (address, lookup) => {}` | The callback to confirm the selected `address` to the `lookup`. Used when `addressVisibility` is set to **lookup**                                        | No       |

### 3D Secure 2

| Parameter         | Description                                                                                                                                                                                                                                      | Required |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `requestorAppUrl` | Alternative `returnURL` value that could be used for 3D Security 2 OOB flow. Always use a [Universal Link](https://developer.apple.com/ios/universal-links/) aka [App Link](https://developer.android.com/training/app-links#android-app-links). | No       |

### ApplePay component

> [!IMPORTANT]
> Requires `amount` and `countryCode`

| Parameter                       | Description                                                                                                                                                                                                                                                                                                                                                                                 | Required                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `merchantID`                    | The [Merchant ID](https://developer.apple.com/library/archive/ApplePay_Guide/Configuration.html) for Apple Pay.                                                                                                                                                                                                                                                                             | Yes                                     |
| `merchantName`                  | The merchant name. This value will be used to generate a single _PKPaymentSummaryItem_.                                                                                                                                                                                                                                                                                                     | Yes, if `summaryItems` is not provided. |
| `allowOnboarding`               | The flag to toggle onboarding. If **true**, allow the shopper to add cards to Apple Pay if none exist yet or none is applicable. If **false**, Apple Pay is disabled when the shopper doesn’t have supported cards on the Apple Pay wallet. The default is **false**.                                                                                                                       | No                                      |
| `summaryItems`                  | An array of [payment summary item](https://developer.apple.com/documentation/passkit/pkpaymentrequest/1619231-paymentsummaryitems) objects that summarize the amount of the payment. The last element of this array must contain the same value as `amount` on the Checkout `\payments` API request. <br>**WARNING**: Adyen uses integer minor units, whereas Apple uses `NSDecimalNumber`. | Yes, if `merchantName` is not provided. |
| `requiredShippingContactFields` | A list of fields that you need for a shipping contact to process the transaction. The list is empty by default.                                                                                                                                                                                                                                                                             | No                                      |
| `requiredBillingContactFields`  | A list of fields that you need for a billing contact to process the transaction. The list is empty by default.                                                                                                                                                                                                                                                                              | No                                      |
| `billingContact`                | Billing contact information for the user. Corresponds to [ApplePayPaymentContact](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentcontact).                                                                                                                                                                                                                   | No                                      |
| `shippingContact`               | Shipping contact information for the user. Corresponds to [ApplePayPaymentContact](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentcontact).                                                                                                                                                                                                                  | No                                      |
| `shippingType`                  | Indicates the display mode for the shipping (e.g. "Pick Up", "Ship To", "Deliver To"). Localized. The default is **shipping**. Corresponds to [PKShippingType](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentrequest/1916128-shippingtype).                                                                                                                 | No                                      |
| `supportedCountries`            | A list of two-letter country codes for limiting payment to cards from specific countries or regions. When provided will filter the selectable payment passes to those issued in the supported countries.                                                                                                                                                                                    | No                                      |
| `shippingMethods`               | The list of shipping methods available for a payment request. Corresponds to [ApplePayShippingMethod](https://developer.apple.com/documentation/apple_pay_on_the_web/applepaypaymentrequest/1916121-shippingmethods).                                                                                                                                                                       | No                                      |
| `recurringPaymentRequest`       | A class that represents a request to set up a recurring payment, typically a subscription. Corresponds to [PKRecurringPaymentRequest](#applepay-recurring-payment).                                                                                                                                                                                                                         | No                                      |

#### ApplePay Recurring payment

| Parameter              | Description                                                                                                                                    | Required |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `paymentDescription`   | The description you provide of the recurring payment and that Apple Pay displays to the user in the payment sheet.                             | Yes      |
| `regularBilling`       | The regular billing cycle for the recurring payment, including start and end dates, an interval, and an interval count.                        | Yes      |
| `managementURL`        | The URL to a web page where the user can update or delete the payment method for the recurring payment.                                        | Yes      |
| `trialBilling`         | The trial billing cycle for the recurring payment.                                                                                             | No       |
| `tokenNotificationURL` | A URL you provide to receive life-cycle notifications from the Apple Pay servers about the Apple Pay merchant token for the recurring payment. | No       |
| `billingAgreement`     | A localized billing agreement that the payment sheet displays to the user before the user authorizes the payment.                              | No       |

### GooglePay component

> [!IMPORTANT]
> Requires `amount` and `countryCode`

| Parameter                       | Description                                                                                                                                                                                                                                                                                                                                                                                    | Required |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `merchantAccount`               | The merchant account to be put in the payment token from Google to Adyen. By default, value from `brands` is used.                                                                                                                                                                                                                                                                             | No       |
| `allowedCardNetworks`           | The card networks you want to support from the list of cards supported by the Google Pay API.                                                                                                                                                                                                                                                                                                  | No       |
| `allowedAuthMethods`            | Fields supported to authenticate a card transaction.                                                                                                                                                                                                                                                                                                                                           | No       |
| `totalPriceStatus`              | The status of the total price used. Defaults to **"FINAL"**.                                                                                                                                                                                                                                                                                                                                   | No       |
| `allowPrepaidCards`             | Set to **false** if you don't support prepaid cards. Default: The prepaid card class is supported for the card networks specified.                                                                                                                                                                                                                                                             | No       |
| `allowCreditCards`              | Set to **false** if you don't support credit cards. Default: The credit card class is supported for the card networks specified.                                                                                                                                                                                                                                                               | No       |
| `billingAddressRequired`        | Set to **true** if you require a billing address. A billing address should only be requested if it's required to process the transaction.                                                                                                                                                                                                                                                      | No       |
| `billingAddressParameters`      | Set billing address parameters:<br><br>- `format` - Billing address format required to complete the transaction.<br> Possible values:<br> MIN _(default)_: Name, country code, and postal code.<br> FULL: Name, street address, locality, region, country code, and postal code.<br><br>- `phoneNumberRequired` - Set to true if a phone number is required for the provided shipping address. | No       |
| `emailRequired`                 | Set to **true** to request an email address.                                                                                                                                                                                                                                                                                                                                                   | No       |
| `shippingAddressRequired`       | Set to **true** to request a full shipping address.                                                                                                                                                                                                                                                                                                                                            | No       |
| `shippingAddressParameters`     | Set shipping address parameters.<br><br> - `allowedCountryCodes` - List of ISO 3166-1 alpha-2 country code values of the countries where shipping is allowed. If this object isn't specified, all shipping address countries are allowed.<br><br> - `phoneNumberRequired` - Set to true if a phone number is required for the provided shipping address.                                       | No       |
| `existingPaymentMethodRequired` | If set to **true** then the `isReadyToPayResponse` object includes an additional paymentMethodPresent property that describes the visitor's readiness to pay with one or more payment methods specified in **allowedPaymentMethods**.                                                                                                                                                          | No       |
| `googlePayEnvironment`          | The environment to be used by GooglePay. Should be either **WalletConstants.ENVIRONMENT_TEST** or **WalletConstants.ENVIRONMENT_PRODUCTION**. By default use `environment` from the root.                                                                                                                                                                                                      | No       |

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
    addressVisibility: 'lookup',
    showStorePaymentField: false,
    hideCvcStoredCard: true,
    hideCvc: true,
    allowedAddressCountryCodes: ['US', 'UK', 'CA', 'NL'],
    onUpdateAddress: (prompt, lookup) => {
      let results = ... // get list of addresses for shopper's prompt
      lookup.update(results);
    },
    onConfirmAddress: (address, lookup) => {
      lookup.confirm(address);
    },
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
        label: 'Free Shipping',
        detail: 'Arrives in 5 to 7 days',
        amount: '0.00',
        identifier: 'FreeShip',
      },
      {
        label: 'Super Shipping',
        detail: 'Arrives super fast',
        amount: '10.00',
        identifier: 'SuperShip',
        startDate: '2022-02-01',
        endDate: '2022-02-10',
      },
    ],
    requiredBillingContactFields: ['phoneticName', 'postalAddress'],
    requiredShippingContactFields: ['name', 'phone', 'email', 'postalAddress'],
    recurringPaymentRequest: {
            description: 'My Subscription',
            regularBilling: {
              amount: 1000,
              label: 'Monthy payment',
              intervalCount: 1,
              intervalUnit: 'month',
              startDate: new Date('2025-04-28'),
            },
            managementURL: 'https://my-domain.com/managementURL',
            trialBilling: {
              amount: 10,
              label: 'Trail week',
              intervalCount: 7,
              intervalUnit: 'day',
              endDate: new Date('2025-04-21'),
            },
            tokenNotificationURL: 'https://my-domain.com/tokenNotificationURL',
            billingAgreement: 'Hereby I am willing to give my money',
          },
        }
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
