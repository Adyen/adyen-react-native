import { View, Button } from 'react-native';
import { AdyenDropIn } from '@adyen/react-native';
import type { Checkout } from '@adyen/react-native';
import Styles from '../../common/Styles';

interface DropInButtonProps {
  checkout: Checkout;
}

/**
 * Launches the Drop-in modal for the shared checkout context created by
 * `setup()` / `setupAdvanced()`.
 */
const DropInButton = ({ checkout }: DropInButtonProps) => {
  return (
    <View style={Styles.padded}>
      <Button
        testID="dropin-button"
        accessibilityLabel="dropin-button"
        title="Drop-in"
        onPress={() => AdyenDropIn.start(checkout)}
      />
    </View>
  );
};

export default DropInButton;
