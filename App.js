/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React from 'react';
import type {Node} from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Alert,
  NativeModules,
  NativeEventEmitter,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

const { AdyenDropIn } = NativeModules;

const environment = {
  apiKey: "{YOUR_DEMO_SERVER_API_KEY}",
  url: "https://checkout-test.adyen.com/v67/"
};

const Section = ({children, title}): Node => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
};

const { CHANNEL } = AdyenDropIn.getConstants();

const globalConfiguration = {
  environment: "test",
  clientKey: "{YOUR_CLIENT_KEY}",
  countryCode: "NL",
  amount: { currency: "EUR", value: 1000 },
  reference: 'Test Order Reference - ' + CHANNEL +' UIHost',
  returnUrl: 'myapp://',
  shopperReference: CHANNEL + ' Checkout Shopper',
  merchantAccount: '{YOUR_MERCHANT_ACCOUNT}',
  shopperLocale: 'en-US',
  additionalData: { 'allow3DS2': true }
};

const fetchPaymentMethods = (configuration) => {
  let paymentMethodsRequest = new Request(environment.url + 'paymentMethods', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': environment.apiKey
  },
  body: JSON.stringify({
    merchantAccount: configuration.merchantAccount,
    countryCode: configuration.countryCode,
    shopperLocale: configuration.shopperLocale,
    amount: configuration.amount
  })
 });

 return fetch(paymentMethodsRequest)
    .then(response => {
      console.log(response);
      if (response.status === 200) {
        return response.json();
      } else {
        throw new Error('Payment methods error ' + response.status + ' ' + response.body);
      }
    })
};

const fetchPayments = (paymentData) => {
  let paymentRequest = new Request(environment.url + 'payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': environment.apiKey
    },
    body: JSON.stringify(paymentData)
  });

 return fetch(paymentRequest)
  .then(response => {
    console.log(response);
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error('Payments error ' + response.status + ' ' + response.json());
    }
  })
};

const fetchPaymentDetails = (configuration, details, paymentData) => {
  let paymentDetailsRequest = new Request(environment.url + 'payments/details', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': environment.apiKey
    },
    body: JSON.stringify({
      paymentData: paymentData,
      details: details,
      merchantAccount: configuration.merchantAccount
    })
  });

 return fetch(paymentDetailsRequest)
  .then(response => {
    console.log(response);
    if (response.status === 200) {
      return response.json();
    } else {
      throw new Error('Payment details error ' + response.status + ' ' + response.json());
    }
  })
};

var globalPaymentMethods = null;

const openDropInComponent = (paymentMethods, configuration) => {

  const eventEmitter = new NativeEventEmitter(NativeModules.AdyenDropIn);
  this.didSubmitCallback = eventEmitter.addListener('didSubmitCallback', didSubmit);
  this.didProvideCallback = eventEmitter.addListener('didProvideCallback', didProvide);
  this.didCompleteCallback = eventEmitter.addListener('didCompleteCallback', didComplete);
  this.didFailCallback = eventEmitter.addListener('didFailCallback', didFail);
  
  AdyenDropIn.openDropIn(paymentMethods, configuration);
};



const didSubmit = (data) => {
  console.log('didSubmit called: ', data.paymentMethod.type);
  
  data.shopperLocale = globalConfiguration.shopperLocale;
  data.channel = CHANNEL;
  data.amount = globalConfiguration.amount;
  data.reference = globalConfiguration.reference;
  data.shopperReference = globalConfiguration.shopperReference;
  data.countryCode = globalConfiguration.countryCode;
  data.merchantAccount = globalConfiguration.merchantAccount;
  data.additionalData = globalConfiguration.additionalData;
  data.returnUrl = data.returnUrl ?? globalConfiguration.returnUrl;

  fetchPayments(data)
  .then(result => {
    if (result.action) {
      console.log('- - Action!');
      AdyenDropIn.handle(result.action);
    } else {
      console.log('- - Not en action!');
      console.log(result);
    }
  })
  .catch(error => {
    console.log('Network error:', error);
  })
};

const didProvide = (data) => {
  console.log('didProvide called '), data;

  fetchPaymentDetails(globalConfiguration, data.details, data.paymentData)
  .then(result => {
      AdyenDropIn.hideDropIn();
      Alert.alert('Payment', result.resultCode);
  })
  .catch(error => {
    console.log('Network error:', error);
  })
};

const didComplete = () => {
  console.log('didProvide called');
  AdyenDropIn.hideDropIn();
};

const didFail = (error) => {
  console.log('setDidFail called: ', error);
  AdyenDropIn.hideDropIn();
};

//  @objc func openDropIn(_ paymentMethods : NSDictionary, configuration: NSDictionary)
const onPress = () => {
  if (!globalPaymentMethods) {
    console.log('Requesting payment methods');
    fetchPaymentMethods(globalConfiguration)
    .then(paymentMethods => {
      globalPaymentMethods = paymentMethods;
      openDropInComponent(paymentMethods, globalConfiguration);
    })
    .catch(error => {
      console.log('Network error:', error);
    })
  } else {
    console.log('Using local payment methods');
    openDropInComponent(globalPaymentMethods, globalConfiguration);
  }
};

const App: () => Node = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>

            <Button
              title="Open DropIn"
              onPress={onPress}
            />

          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.js</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  }
});

export default App;
