import React, { Component } from 'react';
import { NativeEventEmitter } from 'react-native';

export const AdyenCheckoutContext = React.createContext();

export class AdyenPaymentProvider extends Component {

  state = {
    didSubmitCallback: null,
    didCompleteCallback: null,
    didFailCallback: null,
    didProvideCallback: null
  }

  render() {

    const didSubmit = (configuration, data) => {
      data.shopperLocale = configuration.shopperLocale;
      data.channel = configuration.channel;
      data.amount = configuration.amount;
      data.reference = configuration.reference;
      data.shopperReference = configuration.shopperReference;
      data.countryCode = configuration.countryCode;
      data.merchantAccount = configuration.merchantAccount;
      data.additionalData = configuration.additionalData;
      data.returnUrl = data.returnUrl ?? configuration.returnUrl;

      this.props.didSubmit(data)
    };

    const finish = () => {
      if (this.state.didSubmitCallback != null) { this.state.didSubmitCallback.remove() }
      if (this.state.didCompleteCallback != null) { this.state.didCompleteCallback.remove() }
      if (this.state.didFailCallback != null) { this.state.didFailCallback.remove() }
      if (this.state.didProvideCallback != null) { this.state.didProvideCallback.remove() }
    };

    return (
      <AdyenCheckoutContext.Provider
          value={{
            start: (nativeModule, configuration) => {
              finish();
              const eventEmitter = new NativeEventEmitter(nativeModule);
              const didSubmitListener = eventEmitter.addListener('didSubmitCallback', (data) => didSubmit(configuration, data));
              const didProvideListener = eventEmitter.addListener('didProvideCallback', this.props.didProvide);
              const didCompleteListener = eventEmitter.addListener('didCompleteCallback', () => {
                finish();
                this.props.didComplete();
              });
              const didFailListener = eventEmitter.addListener('didFailCallback', (error) => {
                finish();
                this.props.didFail(error);
              });

              this.setState({
                didSubmitCallback: didSubmitListener,
                didProvideCallback: didProvideListener,
                didCompleteCallback: didCompleteListener,
                didFailCallback: didFailListener,
              })
            }
        }} >
        <AdyenCheckoutContext.Consumer>
          {this.props.children}
        </AdyenCheckoutContext.Consumer>
      </AdyenCheckoutContext.Provider>
    );
  }
}
