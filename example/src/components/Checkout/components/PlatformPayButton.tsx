import {
  ApplePayButton,
  GooglePayButton,
  useAdyenCheckout,
  AdyenApplePay,
  AdyenGooglePay,
} from '@adyen/react-native';
import { View, useColorScheme } from 'react-native';
import Styles from '../../common/Styles';
import { useEffect, useState } from 'react';

const PlatformPayButton = () => {
  const { start, config, paymentMethods } = useAdyenCheckout();
  const isDark = useColorScheme() === 'dark';
  const [applePayAvailable, setApplePayAvailable] = useState(false);
  const [googlePayAvailable, setGooglePayAvailable] = useState(false);

  useEffect(() => {
    const applePay = paymentMethods?.paymentMethods?.find(
      (x) => x.type === 'applepay'
    );
    if (applePay) {
      AdyenApplePay.isAvailable(applePay, config)
        .then(setApplePayAvailable)
        .catch(console.error);
    }
    const googlePay = paymentMethods?.paymentMethods?.find(
      (x) => x.type === 'googlepay'
    );
    if (googlePay) {
      AdyenGooglePay.isAvailable(googlePay, config)
        .then(setGooglePayAvailable)
        .catch(console.error);
    }
  }, [paymentMethods, config]);

  return (
    <View>
      {applePayAvailable && (
        <ApplePayButton
          theme={isDark ? 'WHITE' : 'BLACK'}
          type="PLAIN"
          style={Styles.btnClickContain}
          onPress={() => {
            console.log('Paying with apple');
            start('applepay');
          }}
        />
      )}
      {googlePayAvailable && (
        <GooglePayButton
          theme={isDark ? 'LIGHT' : 'DARK'}
          type="PAY"
          style={Styles.btnClickContain}
          onPress={() => {
            console.log('Paying with google');
            start('googlepay');
          }}
        />
      )}
    </View>
  );
};

export default PlatformPayButton;
