import { Text, TouchableOpacity } from 'react-native';
import Styles from '../common/Styles';

type MenuButtonProps = {
  title: string;
  onPress: () => void;
};

const MenuButton = ({ title, onPress }: MenuButtonProps) => (
  <TouchableOpacity style={Styles.transparentButton} onPress={onPress}>
    <Text style={Styles.transparentButtonText}>{title}</Text>
  </TouchableOpacity>
);

export default MenuButton;
