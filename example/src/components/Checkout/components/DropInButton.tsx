import { View, Button } from 'react-native';
import { AdyenDropIn } from '@adyen/react-native';
import type { Checkout, Configuration } from '@adyen/react-native';
import Styles from '../../common/Styles';

interface DropInButtonProps {
  checkout: Checkout;
  configuration: Configuration;
}

/**
 * Launches the Drop-in modal for the shared checkout context created by
 * `setup()` / `setupAdvanced()`.
 */
const DropInButton = ({ checkout, configuration }: DropInButtonProps) => {
  return (
    <View style={Styles.padded}>
      <Button
        testID="dropin-button"
        accessibilityLabel="dropin-button"
        title="Drop-in"
        onPress={() => AdyenDropIn.start(checkout, configuration)}
      />
    </View>
  );
};

export default DropInButton;
