import {
  ApplePayButton,
  GooglePayButton,
  useAdyenCheckout,
} from '@adyen/react-native';
import { Platform, View } from 'react-native';
import Styles from '../../common/Styles';

const PlatformPayButton = () => {
  const { start } = useAdyenCheckout();

  return (
    <View>
      {Platform.OS === 'ios' ? (
        <ApplePayButton
          theme="BLACK"
          type="CONTRIBUTE"
          style={Styles.btnClickContain}
          onPress={() => {
            console.log('Paying with google');
            start('applepay');
          }}
        />
      ) : (
        <GooglePayButton
          theme="LIGHT"
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
