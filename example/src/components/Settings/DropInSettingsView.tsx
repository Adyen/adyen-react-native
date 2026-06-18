import { useCallback, useState } from 'react';
import { Button, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import FormToggle from '../common/FormToggle';
import FormTextInput from '../common/FormTextInput';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'DropInSettings'>;

const DropInSettingsView = ({ navigation }: Props) => {
  const { configuration, update } = useAppContext();
  const insets = useSafeAreaInsets();
  const existing = configuration.dropInSettings ?? {};

  const [showPreselected, setShowPreselected] = useState(
    existing.showPreselectedStoredPaymentMethod ?? true
  );
  const [skipListWhenSingle, setSkipListWhenSingle] = useState(
    existing.skipListWhenSinglePaymentMethod ?? false
  );
  const [showRemoveButton, setShowRemoveButton] = useState(
    existing.showRemovePaymentMethodButton ?? true
  );
  const [title, setTitle] = useState(existing.title ?? '');

  const saveAndGoBack = useCallback(() => {
    update({
      dropInSettings: {
        showPreselectedStoredPaymentMethod: showPreselected,
        skipListWhenSinglePaymentMethod: skipListWhenSingle,
        showRemovePaymentMethodButton: showRemoveButton,
        title: title || undefined,
      },
    });
    navigation.goBack();
  }, [
    update,
    navigation,
    showPreselected,
    skipListWhenSingle,
    showRemoveButton,
    title,
  ]);

  return (
    <ScrollView
      style={Styles.page}
      contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <FormToggle
        title="Show Preselected Stored Payment"
        value={showPreselected}
        onValueChange={setShowPreselected}
      />
      <FormToggle
        title="Skip List When Single Method"
        value={skipListWhenSingle}
        onValueChange={setSkipListWhenSingle}
      />
      <FormToggle
        title="Show Remove Payment Button"
        value={showRemoveButton}
        onValueChange={setShowRemoveButton}
      />
      <FormTextInput
        title="Title (iOS only)"
        value={title}
        onChangeText={setTitle}
        placeholder="App name used by default"
      />
      <View style={Styles.formAction}>
        <Button title="Save" onPress={saveAndGoBack} />
      </View>
    </ScrollView>
  );
};

export default DropInSettingsView;
