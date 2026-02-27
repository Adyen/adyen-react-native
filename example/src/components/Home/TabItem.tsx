import { Text, TouchableOpacity } from 'react-native';
import Styles from '../common/Styles';

type TabItemProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const TabItem = ({ label, isActive, onPress }: TabItemProps) => (
  <TouchableOpacity
    style={[Styles.tab, isActive && Styles.activeTab]}
    onPress={onPress}
  >
    <Text style={[Styles.tabText, isActive && Styles.activeTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default TabItem;
