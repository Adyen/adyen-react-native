import { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  useColorScheme,
} from 'react-native';
import Styles from './Styles';
import AdaptiveText from './AdaptiveText';
import Colors from './Assets';

type FormDropdownProps<T extends string> = {
  title: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
};

const FormDropdown = <T extends string>({
  title,
  value,
  options,
  onChange,
}: FormDropdownProps<T>) => {
  const [visible, setVisible] = useState(false);
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
        onPress={() => setVisible(true)}
      >
        <AdaptiveText style={Styles.dropdownText}>{value}</AdaptiveText>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={Styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[Styles.dropdownMenu, { backgroundColor }]}>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    Styles.dropdownItem,
                    item === value && Styles.dropdownItemSelected,
                  ]}
                  onPress={() => {
                    onChange(item);
                    setVisible(false);
                  }}
                >
                  <AdaptiveText
                    style={[
                      Styles.dropdownText,
                      { color: textColor },
                      item === value && Styles.dropdownItemSelectedText,
                    ]}
                  >
                    {item}
                  </AdaptiveText>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default FormDropdown;
