This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Build librarty

Before begining with the app, make sure you have build binaries in the root folder.

```bash
npm start
```

This will fetch dependencies and generate compressed binaries in *lib/* folder.

## Step 2: Provide credentials

This project uses `example/src/secrets.json` to store local, non-committed keys and configuration for the example app.

Create a `secrets.json` file in the `example/` directory with the following structure (DO NOT commit this file to the repository):

```json
{
  "clientKey": "your_client_key",
  "demoServerApiKey": "your_demo_server_api_key",
  "merchantAccount": "your_merchant_account",
  "publicKey": "your_public_key",
  "appleMerchantId": "merchant.com.your_apple_merchant_id"
}
```

* CLIENT_KEY: Your Adyen [client Key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key) for the client-side drop-in/components.
* DEMO_SERVER_API_KEY: [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key) key for the Adyen API.
* MERCHANT_ACCOUNT: Your [Merchant Account](https://docs.adyen.com/account/account-structure/#merchant-accounts) name.
* PUBLIC_KEY: Your [public RSA key](https://docs.adyen.com/online-payments/classic-integrations/classic-api-integration/client-side-encryption/cse-library-public-key-location-and-token) (optional).
* APPLE_MERCHANT_ID: Your Apple Pay merchant identifier (optional).

> [!NOTE]
> For debugging purposes, this app is set up to directly contact the Adyen API. 
> Do not reach out to the Adyen API directly from your client and never store the `API key` in your source code.

## Step 3: Start your Application

Let Metro Bundler run in its _own_ terminal. Run the following command to start your _Android_ or _iOS_ app.
First, it will start a **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

### For Android

```bash
# using Yarn
yarn app android
```

### For iOS

```bash
# using Yarn
yarn app pod
yarn app ios
```

If everything is set up _correctly_, you should see the app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.
