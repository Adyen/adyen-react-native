import React, { Component } from "react";
import { fetchPaymentMethods } from "./APIClient";
import { defaultConfiguration } from "./Configuration";

export const PaymentMethodsContext = React.createContext();

class PaymentMethodsProvider extends Component {

    state = { 
        config: defaultConfiguration, 
        paymentMethods: null 
    }

    render() {
        return (
            <PaymentMethodsContext.Provider
                value={{
                    config: this.state.config,
                    paymentMethods: this.state.paymentMethods,
                    onConfigChanged: newConfig => { 
                        console.log('Requesting payment methods');
                        fetchPaymentMethods(newConfig)
                        .then(paymentMethods => {
                            this.setState({ 
                                config: newConfig, 
                                paymentMethods: paymentMethods 
                            })
                        })
                        .catch(error => {
                            console.log('Network error:', error);
                        })
                    }
                }}
            >
                {this.props.children}
            </PaymentMethodsContext.Provider>
        );
    }
}

export default PaymentMethodsProvider;