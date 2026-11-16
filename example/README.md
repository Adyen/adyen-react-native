This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

> **Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Build

Build the library from the repository root:

```bash
npm start
```

This will fetch dependencies and generate compressed binaries in _lib/_ folder.

## Step 2: Provide credentials

The example app reads its keys from `example/secrets.json`. `npm start` creates it from corresponding environment variables. You can also create it manually. Make sure not to commit it.

```json
{
  "CLIENT_KEY": "your_client_key",
  "DEMO_SERVER_API_KEY": "your_demo_server_api_key",
  "MERCHANT_ACCOUNT": "your_merchant_account",
  "PUBLIC_KEY": "your_public_key",
  "APPLE_MERCHANT_ID": "merchant.com.your_apple_merchant_id"
}
```

- CLIENT_KEY: Your Adyen [client key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key) for the client-side drop-in/components.
- DEMO_SERVER_API_KEY: [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key) for the Adyen API.
- MERCHANT_ACCOUNT: Your [Merchant Account](https://docs.adyen.com/account/account-structure/#merchant-accounts) name.
- PUBLIC_KEY: Your [public RSA key](https://docs.adyen.com/online-payments/classic-integrations/classic-api-integration/client-side-encryption/cse-library-public-key-location-and-token) (optional).
- APPLE_MERCHANT_ID: Your Apple Pay merchant identifier (optional).

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
yarn app spm
yarn app ios
```

The iOS project uses Swift Package Manager (no CocoaPods). On a fresh install, run `yarn app spm` and run it again after every `yarn install`. It writes the Package.swift stopgap into `node_modules` for dependencies that do not ship one (currently `@react-native-async-storage/async-storage`) and keeps the SPM project in sync.

`yarn app ios` builds, installs, and launches the app on a booted simulator; it does not start Metro, so start the bundler in a separate terminal with `yarn app start` first.

If everything is set up _correctly_, you should see the app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.
