import { useCallback, useMemo, useState } from 'react';
import {
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import Colors from '../../common/Assets';
import DropdownTrigger from './DropdownTrigger';

const defaultLabelExtractor = (v: string): string => v;

type FormSearchDropdownProps<T extends string> = {
  title: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  labelExtractor?: (value: T) => string;
};

const FormSearchDropdown = <T extends string>({
  title,
  value,
  options,
  onChange,
  labelExtractor = defaultLabelExtractor,
}: FormSearchDropdownProps<T>) => {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundColor = isDarkMode
    ? Colors.textBackgroundDark
    : Colors.textBackgroundLight;
  const modalBackground = isDarkMode ? '#1c1c1e' : '#f2f2f7';
  const textColor = isDarkMode ? Colors.textDark : Colors.textLight;

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((item) =>
      (labelExtractor(item) ?? '').toLowerCase().includes(query)
    );
  }, [options, searchQuery, labelExtractor]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setSearchQuery('');
  }, []);

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
        animationType="slide"
        onRequestClose={handleClose}
      >
        <SafeAreaView
          style={[Styles.fullScreenModal, { backgroundColor: modalBackground }]}
        >
          <View style={Styles.fullScreenHeader}>
            <TouchableOpacity onPress={handleClose}>
              <AdaptiveText style={Styles.fullScreenCancel}>
                Cancel
              </AdaptiveText>
            </TouchableOpacity>
            <AdaptiveText style={Styles.fullScreenTitle}>{title}</AdaptiveText>
            <View style={Styles.fullScreenHeaderSpacer} />
          </View>
          <View style={[Styles.searchContainer, { backgroundColor }]}>
            <TextInput
              style={[Styles.searchInput, { color: textColor }]}
              placeholder="Search..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            renderItem={renderItem}
            style={Styles.fullScreenList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        </SafeAreaView>
      </Modal>
    </DropdownTrigger>
  );
};

export default FormSearchDropdown;
