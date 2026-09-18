import { Text, TouchableOpacity } from 'react-native';
import Styles from '../common/Styles';

type MenuButtonProps = {
  title: string;
  testID?: string;
  onPress: () => void;
};

const MenuButton = ({ title, testID, onPress }: MenuButtonProps) => (
  <TouchableOpacity
    testID={testID}
    accessibilityLabel={testID}
    style={Styles.transparentButton}
    onPress={onPress}
  >
    <Text style={Styles.transparentButtonText}>{title}</Text>
  </TouchableOpacity>
);

export default MenuButton;
