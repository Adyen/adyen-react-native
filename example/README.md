This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

## Step 1: Build librarty

Before begining with the app, make sure you have build binaries in the root folder.

```bash
# using npm
npm install

# OR using Yarn
yarn install
```

This will fetch dependencies and generate compressed binaries in *lib/* folder.

## Step 2: Provide credentials

 In `src/Configuration.js` replace following placeholders with your keys:

 | Key | Value |
 | --- | --- |
 | {YOUR_DEMO_SERVER_API_KEY} | Your [API key](https://docs.adyen.com/development-resources/how-to-get-the-api-key) | 
 | {YOUR_CLIENT_KEY} | Your [Client Key](https://docs.adyen.com/development-resources/client-side-authentication#get-your-client-key) |
 | {YOUR_MERCHANT_ACCOUNT} | Your [Merchant Account](https://docs.adyen.com/account/account-structure/#merchant-accounts) |

> [!NOTE]
> For debugging purposes, this app is set up to directly contact the Adyen API. 
> Do not reach out to the Adyen API directly from your client and never store the `API key` in your source code.

## Step 3: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the *example/* folder:

```bash
# using npm
npm start

# OR using Yarn
yarn start
```

## Step 4: Start your Application

Let Metro Bundler run in its _own_ terminal. Open a _new_ terminal from the _root_ of your React Native project. Run the following command to start your _Android_ or _iOS_ app:

### For Android

```bash
# using npm
npm run android

# OR using Yarn
yarn android
```

### For iOS

```bash
# using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up _correctly_, you should see the app running in your _Android Emulator_ or _iOS Simulator_ shortly provided you have set up your emulator/simulator correctly.

This is one way to run your app — you can also run it directly from within Android Studio and Xcode respectively.
