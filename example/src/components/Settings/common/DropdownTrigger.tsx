import { type PropsWithChildren } from 'react';
import { TouchableOpacity, View, useColorScheme } from 'react-native';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import Colors from '../../common/Assets';

type DropdownTriggerProps = {
  title: string;
  label: string;
  onPress: () => void;
};

const DropdownTrigger = ({
  title,
  label,
  onPress,
  children,
}: PropsWithChildren<DropdownTriggerProps>) => {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundColor = isDarkMode
    ? Colors.textBackgroundDark
    : Colors.textBackgroundLight;
  const textColor = isDarkMode ? Colors.textDark : Colors.textLight;

  return (
    <View>
      <AdaptiveText style={Styles.paddedTitle}>{title}</AdaptiveText>
      <TouchableOpacity
        style={[Styles.dropdown, { backgroundColor }]}
        onPress={onPress}
      >
        <AdaptiveText style={Styles.dropdownText}>{label}</AdaptiveText>
        <AdaptiveText style={[Styles.dropdownText, { color: textColor }]}>
          {'›'}
        </AdaptiveText>
      </TouchableOpacity>
      {children}
    </View>
  );
};

export default DropdownTrigger;
