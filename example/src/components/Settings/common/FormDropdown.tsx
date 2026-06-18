import { useCallback, useState } from 'react';
import {
  TouchableOpacity,
  Pressable,
  Modal,
  FlatList,
  useColorScheme,
} from 'react-native';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import Colors from '../../common/Assets';
import DropdownTrigger from './DropdownTrigger';

const defaultLabelExtractor = (v: string): string => v;

type FormDropdownProps<T extends string> = {
  title: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  labelExtractor?: (value: T) => string;
};

const FormDropdown = <T extends string>({
  title,
  value,
  options,
  onChange,
  labelExtractor = defaultLabelExtractor,
}: FormDropdownProps<T>) => {
  const [visible, setVisible] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundColor = isDarkMode
    ? Colors.textBackgroundDark
    : Colors.textBackgroundLight;
  const textColor = isDarkMode ? Colors.textDark : Colors.textLight;

  const handleClose = useCallback(() => setVisible(false), []);

  const handleSelect = useCallback(
    (item: T) => {
      onChange(item);
      handleClose();
    },
    [onChange, handleClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: T }) => (
      <TouchableOpacity
        style={[
          Styles.dropdownItem,
          item === value && Styles.dropdownItemSelected,
        ]}
        onPress={() => handleSelect(item)}
      >
        <AdaptiveText
          style={[
            Styles.dropdownText,
            { color: textColor },
            item === value && Styles.dropdownItemSelectedText,
          ]}
        >
          {labelExtractor(item)}
        </AdaptiveText>
      </TouchableOpacity>
    ),
    [value, textColor, labelExtractor, handleSelect]
  );

  return (
    <DropdownTrigger
      title={title}
      label={labelExtractor(value)}
      onPress={() => setVisible(true)}
    >
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable style={Styles.dropdownOverlay} onPress={handleClose}>
          <Pressable
            onPress={() => {}}
            style={[Styles.dropdownMenu, { backgroundColor }]}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={renderItem}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </DropdownTrigger>
  );
};

export default FormDropdown;
