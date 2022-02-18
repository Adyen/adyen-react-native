import React, { Component } from 'react';

export const AdyenCheckoutContext = React.createContext();

export class AdyenPaymentProvider extends Component {

  state = {
    didSubmitCallback: null,
    didCompleteCallback: null,
    didFailCallback: null,
    didProvideCallback: null
  }

  didSubmit = (configuration, data) => {
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

  finish = () => {
    if (this.state.didSubmitCallback != null) { this.state.didSubmitCallback.remove() }
    if (this.state.didCompleteCallback != null) { this.state.didCompleteCallback.remove() }
    if (this.state.didFailCallback != null) { this.state.didFailCallback.remove() }
    if (this.state.didProvideCallback != null) { this.state.didProvideCallback.remove() }
  };

  render() {

    return (
      <AdyenCheckoutContext.Provider
          value={{
            start: (eventEmitter, configuration) => {
              finish();
              this.setState({
                didSubmitCallback: eventEmitter.addListener('didSubmitCallback', (data) => this.didSubmit(configuration, data)),
                didProvideCallback: eventEmitter.addListener('didProvideCallback', this.props.didProvide),
                didCompleteCallback: eventEmitter.addListener('didCompleteCallback', () => {
                  this.finish();
                  this.props.didComplete();
                }),
                didFailCallback: eventEmitter.addListener('didFailCallback', (error) => {
                  this.finish();
                  this.props.didFail(error);
                }),
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
