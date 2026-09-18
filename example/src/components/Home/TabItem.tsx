import { Text, TouchableOpacity } from 'react-native';
import Styles from '../common/Styles';

type TabItemProps = {
  label: string;
  testID?: string;
  isActive: boolean;
  onPress: () => void;
};

const TabItem = ({ label, testID, isActive, onPress }: TabItemProps) => (
  <TouchableOpacity
    testID={testID}
    accessibilityLabel={testID}
    style={[Styles.tab, isActive && Styles.activeTab]}
    onPress={onPress}
  >
    <Text style={[Styles.tabText, isActive && Styles.activeTabText]}>
      {label}
    </Text>
  </TouchableOpacity>
);

export default TabItem;
