import { Text, TouchableOpacity } from 'react-native';
import Styles from '../common/Styles';

type MenuButtonProps = {
  title: string;
  testID?: string;
  onPress: () => void;
  disabled?: boolean;
};

const MenuButton = ({
  title,
  testID,
  onPress,
  disabled = false,
}: MenuButtonProps) => (
  <TouchableOpacity
    testID={testID}
    accessibilityLabel={testID}
    style={[Styles.transparentButton]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text
      style={[
        Styles.transparentButtonText,
        disabled && Styles.transparentButtonDisabled,
      ]}
    >
      {title}
    </Text>
  </TouchableOpacity>
);

export default MenuButton;
