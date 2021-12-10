import React, { Component } from "react";

import {
    Alert,
    NativeModules,
    NativeEventEmitter,
} from 'react-native';

import { fetchPayments, fetchPaymentDetails } from './APIClient' ;

const { AdyenDropIn } = NativeModules;

export const AdyenCheckoutContext = React.createContext();

export class AdyenDropInProvider extends Component {

  state = {
    didSubmitCallback: null, 
    didCompleteCallback: null,
    didFailCallback: null,
    didProvideCallback: null
  }

  render() {
    return (
      <AdyenCheckoutContext.Provider
          value={{
            openDropInComponent: (paymentMethods, configuration) => { 
              const eventEmitter = new NativeEventEmitter(NativeModules.AdyenDropIn);

              if (this.state.didSubmitCallback != null) { this.state.didSubmitCallback.remove() }
              if (this.state.didCompleteCallback != null) { this.state.didCompleteCallback.remove() }
              if (this.state.didFailCallback != null) { this.state.didFailCallback.remove() }
              if (this.state.didProvideCallback != null) { this.state.didProvideCallback.remove() }

              this.setState({
                didSubmitCallback: eventEmitter.addListener('didSubmitCallback', (data) =>  didSubmit(configuration, data) ),
                didProvideCallback: eventEmitter.addListener('didProvideCallback', (data) =>  didProvide(configuration, data) ),
                didCompleteCallback: eventEmitter.addListener('didCompleteCallback', didComplete),
                didFailCallback: eventEmitter.addListener('didFailCallback', didFail),
              })

              AdyenDropIn.openDropIn(paymentMethods, configuration);
            }
          }}
      >
        <AdyenCheckoutContext.Consumer>
          {this.props.children}
        </AdyenCheckoutContext.Consumer>
      </AdyenCheckoutContext.Provider>
    );
  }
}

const showAlert = (message) => { 
  setTimeout( function () { 
    console.log('Alert:' + message.stringify);
    Alert.alert('Payment', message);
  }, 4000 );
};

const didSubmit = (configuration, data) => {
  console.log('didSubmit called: ', data.paymentMethod.type);
  
  data.shopperLocale = configuration.shopperLocale;
  data.channel = configuration.channel;
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
      showAlert(result.resultCode);
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
      showAlert(result.resultCode);
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
