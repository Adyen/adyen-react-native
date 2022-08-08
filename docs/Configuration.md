# Configuration

# The following parameters must be set on the AdyenCheckout main instance.

### Root configurations
* environment - Use test. When you're ready to accept live payments, change the value to one of our [live environments](https://docs.adyen.com/online-payments/drop-in-web#testing-your-integration).
* clientKey - A public key linked to your API credential, used for [client-side authentication](https://docs.adyen.com/development-resources/client-side-authentication).
* amount - Amount to be displayed on the Pay Button. It expects an object with the minor units value and currency properties. For example, { value: 1000, currency: 'USD' }. For BIN or card verification requests, set amount to 0 (zero).
* countryCode - The shopper's country code in ISO 3166-1 alpha-2 format. Example: NL or DE.
* shopperLocale - 🚧 Work in progress. In current version this property only localises payment methods names. Default OS's locale is used for localisation. You can override  

## React Native SDK provides following configurations for components:

### DropIn component
* showPreselectedStoredPaymentMethod - Determines whether to enable preselected stored payment method view step. Defaults to true.
* skipListWhenSinglePaymentMethod - Determines whether to enable skipping payment list step when there is only one non-instant payment method. Defaults to false.

### Card component
* showStorePaymentField - Indicates if the field for storing the card payment method should be displayed in the form. Defaults to true.
* holderNameRequired - Indicates if the field for entering the holder name should be displayed in the form. Defaults to false.
* hideCvcStoredCard - Indicates whether to show the security code field on a stored card payment. Defaults to false.
* hideCvc - Indicates whether to show the security code field at all. Defaults to false.
* addressVisibility - Indicates the display mode of the billing address form. Options: "none" or "postal". Defaults to "none".
* kcpVisibility - Indicates whether to show the security fields for South Korea issued cards. Options: "show" or "hide". Defaults to "hide".
* socialSecurity - ndicates the visibility mode for the social security number field (CPF/CNPJ) for Brazilian cards. Options: "show" or "hide". Defaults to "hide".
* supported - The list of allowed card types. By default uses list of `brands` from payment method. Fallbacks to list of all known cards.

### ApplePay component
* merchantID - The merchant identifier for apple pay.
* merchantName - The merchant name. Used for generation of [PKPaymentSummaryItem]

### GooglePay component
* merchantAccount - The merchant account to be put in the payment token from Google to Adyen. By default uses value from `brands`
* allowedCardNetworks - One or more card networks that you support, also supported by the Google Pay API.
* allowedAuthMethods - Fields supported to authenticate a card transaction.
* totalPriceStatus - The status of the total price used. Defaults to "FINAL".
* allowPrepaidCards - Set to false if you don't support prepaid cards. Default: The prepaid card class is supported for the card networks specified.
* billingAddressRequired - Set to true if you require a billing address. A billing address should only be requested if it's required to process the transaction.
* emailRequired - Set to true to request an email address.
* shippingAddressRequired - Set to true to request a full shipping address.
* existingPaymentMethodRequired
* googlePayEnvironment - The environment to be used by GooglePay. Should be either [WalletConstants.ENVIRONMENT_TEST] or [WalletConstants.ENVIRONMENT_PRODUCTION]. By default is using `environment` from root.
