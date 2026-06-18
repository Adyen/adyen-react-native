import { useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  SafeAreaView,
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
  labelExtractor?: (value: T) => string;
  fullScreen?: boolean;
};

const FormDropdown = <T extends string>({
  title,
  value,
  options,
  onChange,
  labelExtractor = (v) => v,
  fullScreen = false,
}: FormDropdownProps<T>) => {
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
      labelExtractor(item).toLowerCase().includes(query)
    );
  }, [options, searchQuery, labelExtractor]);

  const handleClose = () => {
    setVisible(false);
    setSearchQuery('');
  };

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
    <View>
      <AdaptiveText style={Styles.paddedTitle}>{title}</AdaptiveText>
      <TouchableOpacity
        style={[Styles.dropdown, { backgroundColor }]}
        onPress={() => setVisible(true)}
      >
        <AdaptiveText style={Styles.dropdownText}>
          {labelExtractor(value)}
        </AdaptiveText>
        <AdaptiveText style={[Styles.dropdownText, { color: textColor }]}>
          {'\u203a'}
        </AdaptiveText>
      </TouchableOpacity>
      <Modal
        visible={visible}
        transparent={!fullScreen}
        animationType={fullScreen ? 'slide' : 'fade'}
        onRequestClose={handleClose}
      >
        {fullScreen ? (
          <SafeAreaView
            style={[
              Styles.fullScreenModal,
              { backgroundColor: modalBackground },
            ]}
          >
            <View style={Styles.fullScreenHeader}>
              <TouchableOpacity onPress={handleClose}>
                <AdaptiveText style={Styles.fullScreenCancel}>
                  Cancel
                </AdaptiveText>
              </TouchableOpacity>
              <AdaptiveText style={Styles.fullScreenTitle}>
                {title}
              </AdaptiveText>
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
            />
          </SafeAreaView>
        ) : (
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
        )}
      </Modal>
    </View>
  );
};

export default FormDropdown;
