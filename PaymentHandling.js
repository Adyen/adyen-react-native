import {
    Alert,
    NativeModules,
    NativeEventEmitter,
} from 'react-native';

import { fetchPayments, fetchPaymentDetails } from './APIClient' ;

const { AdyenDropIn } = NativeModules;
const { CHANNEL } = AdyenDropIn.getConstants();

export const channel = CHANNEL;

export const openDropInComponent = (paymentMethods, configuration) => {

  const eventEmitter = new NativeEventEmitter(NativeModules.AdyenDropIn);
  
  if (this.didSubmitCallback != null) { this.didSubmitCallback.remove() }
  if (this.didCompleteCallback != null) { this.didCompleteCallback.remove() }
  if (this.didFailCallback != null) { this.didFailCallback.remove() }
  if (this.didProvideCallback != null) { this.didProvideCallback.remove() }
  
  this.didSubmitCallback = eventEmitter.addListener('didSubmitCallback', (data) =>  didSubmit(configuration, data) );
  this.didProvideCallback = eventEmitter.addListener('didProvideCallback', (data) =>  didProvide(configuration, data) );
  this.didCompleteCallback = eventEmitter.addListener('didCompleteCallback', didComplete);
  this.didFailCallback = eventEmitter.addListener('didFailCallback', didFail);
  
  AdyenDropIn.openDropIn(paymentMethods, configuration);
};

const didSubmit = (configuration, data) => {
  console.log('didSubmit called: ', data.paymentMethod.type);
  
  data.shopperLocale = configuration.shopperLocale;
  data.channel = CHANNEL;
  data.amount = configuration.amount;
  data.reference = configuration.reference;
  data.shopperReference = configuration.shopperReference;
  data.countryCode = configuration.countryCode;
  data.merchantAccount = configuration.merchantAccount;
  data.additionalData = configuration.additionalData;
  data.returnUrl = data.returnUrl ?? configuration.returnUrl;

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

const didProvide = (configuration, data) => {
  console.log('didProvide called '), data;

  fetchPaymentDetails(configuration, data.details, data.paymentData)
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
