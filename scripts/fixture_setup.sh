#!/bin/bash

set -euo pipefail

# Default values
expo=''
rn=''
name="tested_app"

# Parse flags
while getopts r:e:n: flag
do
    case "${flag}" in
        r) rn=${OPTARG}
           ;;
        e) expo=${OPTARG}
           ;;
        n) name=${OPTARG}
           ;;
    esac
done

if [ -z "$name" ]; then
  echo "Error: App name argument missing."
  exit 1
fi

# Sanitize name
name=${name//./}

# Clean previous runs
rm -rf "$name"

# Determine CLI version based on RN version
major_version=$(echo "$rn" | cut -d '.' -f 1,2)

case $major_version in
  '0.81' | '0.82' ) cli_version='^20.0.0' ;;
  '0.80' ) cli_version='^19.0.0' ;;
  '0.79' ) cli_version='^18.0.0' ;;
  '0.76' | '0.77' | '0.78' ) cli_version='^15.0.0' ;;
  '0.75' ) cli_version='^14.0.0' ;;
  '0.74' ) cli_version='^13.0.0' ;;
  '0.73' ) cli_version='^12.0.0' ;;
  '0.72' ) cli_version='^11.0.0' ;;
  '0.71' ) cli_version='^10.0.0' ;;
  '0.70' ) cli_version='^9.0.0' ;;
  * )      cli_version='15.1.3' ;;
esac

echo "== Using CLI $cli_version"

if [ ! -z "$expo" ]; then
    echo "== Building Expo"
    npx create-expo-app "$name" --template default@"$expo" --no-install
else
    echo "== Building React-Native $rn"
    npx @react-native-community/cli@"$cli_version" init --directory "$name" --version "$rn" --install-pods false --skip-install TestProject
fi

cd "$name" || exit

# Ensure Yarn treats this directory as an independent project (not a workspace of the repo root)
touch yarn.lock

echo -e "== Install Dependencies\n"
cp ../adyen-react-native.tgz . || exit 1
yarn add ./adyen-react-native.tgz
yarn add -D webdriverio @wdio/cli @wdio/local-runner @wdio/appium-service

cp ../scripts/check-app.js ./check-app.js

echo -e "== Add default App.tsx\n"
# We write placeholders (__CLIENT_KEY__, __PUBLIC_KEY__) which we will replace via sed below.
cat > App.tsx <<- 'EOF'
import {
  AdyenActionComponent,
  AdyenCSE,
  AdyenCheckout,
  AdyenComponent,
  AdyenError,
  Configuration,
  PaymentMethodData,
  PaymentMethodsResponse,
  useAdyenCheckout,
} from '@adyen/react-native';
import React, { useCallback } from 'react';
import {
  Button,
  ScrollView,
  StatusBar,
  useColorScheme,
  View,
} from 'react-native';

const configuration: Configuration = {
  returnUrl: 'myapp://payment',
  environment: 'test',
  clientKey: '__CLIENT_KEY__',
  card: {
    holderNameRequired: true,
  },
};

const paymentMethods: PaymentMethodsResponse = {
  paymentMethods: [
    {
      brands: ['visa', 'mc', 'maestro'],
      type: 'scheme',
      name: 'Card',
    },
    {
      type: 'klarna',
      name: 'Klarna',
    },
  ],
};

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const onError = useCallback(
    (error: AdyenError, component: AdyenComponent) => {
      console.debug(error);
      component.hide(false);
    },
    [],
  );

  const onSubmit = useCallback(
    async (data: PaymentMethodData, dropIn: AdyenActionComponent) => {
      try {
        console.log('In');
        console.log('Out');
        dropIn.hide(true);
      } catch (error) {
        console.error(error);
        dropIn.hide(false);
      }
    },
    [],
  );

  return (
    <View>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{}}>
          <AdyenCheckout
            config={configuration}
            paymentMethods={paymentMethods}
            onSubmit={onSubmit}
            onError={onError}
          >
            <MyCheckoutView />
          </AdyenCheckout>
        </View>
      </ScrollView>
    </View>
  );
}

const MyCheckoutView = () => {
  const { start } = useAdyenCheckout();

  return (
    <View>
      <Button
        testID="dropin-button"
        title="Open DropIn"
        onPress={async () => {
          start('dropin');
        }}
      />
      <Button
        testID="card-button"
        title="Open cards"
        onPress={async () => {
          start('card');
        }}
      />
      <Button
        testID="klarna-button"
        title="Open Klarna"
        onPress={async () => {
          start('klarna');
        }}
      />
      <Button
        testID="cse-button"
        title="CSE"
        onPress={async () => {
          let result = await AdyenCSE.encryptBin(
            '545454545454',
            '__PUBLIC_KEY__'
          );
          console.log(result);
        }}
      />
    </View>
  );
};

export default App;
EOF