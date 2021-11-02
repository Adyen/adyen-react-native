import {
    Alert,
    NativeModules,
    NativeEventEmitter,
} from 'react-native';

import { fetchPaymentMethods, fetchPayments, fetchPaymentDetails } from './BackendClient' ;
import { globalConfiguration } from './GlobalConfiguration';

const { AdyenDropIn } = NativeModules;
const { CHANNEL } = AdyenDropIn.getConstants();

var globalPaymentMethods = null;

  //  @objc func openDropIn(_ paymentMethods : NSDictionary, configuration: NSDictionary)
export const onOpenDropInPress = () => {
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
      AdyenDropIn.hideDropIn();
      Alert.alert('Payment', result.resultCode);
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