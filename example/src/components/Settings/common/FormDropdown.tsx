import { useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  FlatList,
  useColorScheme,
} from 'react-native';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import Colors from '../../common/Assets';
import DropdownTrigger from './DropdownTrigger';

type FormDropdownProps<T extends string> = {
  title: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  labelExtractor?: (value: T) => string;
};

const FormDropdown = <T extends string>({
  title,
  value,
  options,
  onChange,
  labelExtractor = (v) => v,
}: FormDropdownProps<T>) => {
  const [visible, setVisible] = useState(false);
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundColor = isDarkMode
    ? Colors.textBackgroundDark
    : Colors.textBackgroundLight;
  const textColor = isDarkMode ? Colors.textDark : Colors.textLight;

  const handleClose = () => setVisible(false);

  const handleSelect = (item: T) => {
    onChange(item);
    handleClose();
  };

  const renderItem = ({ item }: { item: T }) => (
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
        <TouchableOpacity
          style={Styles.dropdownOverlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[Styles.dropdownMenu, { backgroundColor }]}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={renderItem}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </DropdownTrigger>
  );
};

export default FormDropdown;
