import { useAdyenCheckout } from '@adyen/react-native';
import Styles from '../../common/Styles';
import { View, Button } from 'react-native';

const DropInButton = () => {
  const { start } = useAdyenCheckout();
  return (
    <View style={Styles.padded}>
      <Button
        title="Drop-in"
        testID="dropin-button"
        onPress={() => start('dropin')}
      />
    </View>
  );
};

export default DropInButton;
