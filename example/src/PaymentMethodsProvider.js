import React, { Component } from 'react';
import { fetchPaymentMethods } from './APIClient';
import { DEFAULT_CONFIGURATION } from './Configuration';

export const PaymentMethodsContext = React.createContext();

class PaymentMethodsProvider extends Component {
  state = {
    config: DEFAULT_CONFIGURATION,
    paymentMethods: null,
  };

  render() {
    return (
      <PaymentMethodsContext.Provider
        value={{
          config: this.state.config,
          paymentMethods: this.state.paymentMethods,
          onConfigChanged: (newConfig) => {
            fetchPaymentMethods(newConfig)
              .then((paymentMethods) => {
                this.setState({
                  config: newConfig,
                  paymentMethods: paymentMethods,
                });
              })
              .catch((error) => {
                this.props.onError(error);
              });
          },
        }}
      >
        {this.props.children}
      </PaymentMethodsContext.Provider>
    );
  }
}

export default PaymentMethodsProvider;
