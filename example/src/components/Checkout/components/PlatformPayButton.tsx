import {
  ApplePayButton,
  GooglePayButton,
  useAdyenCheckout,
} from '@adyen/react-native';
import { Platform, View, useColorScheme } from 'react-native';
import Styles from '../../common/Styles';

const PlatformPayButton = () => {
  const { start } = useAdyenCheckout();
  const isDark = useColorScheme() === 'dark';

  return (
    <View>
      {Platform.OS === 'ios' ? (
        <ApplePayButton
          theme={isDark ? 'BLACK' : 'WHITE'}
          type="CONTRIBUTE"
          style={Styles.btnClickContain}
          onPress={() => {
            console.log('Paying with apple');
            start('applepay');
          }}
        />
      ) : (
        <GooglePayButton
          theme={isDark ? 'DARK' : 'LIGHT'}
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
