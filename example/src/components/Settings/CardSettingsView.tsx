import { useCallback, useState } from 'react';
import { Button, ScrollView, View } from 'react-native';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import FormToggle from '../common/FormToggle';
import FormDropdown from '../common/FormDropdown';
import type { CardSettings } from '../../settings/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'CardSettings'>;

const addressModes = ['none', 'postalCode', 'full', 'lookup'] as const;
const fieldVisibilities = ['show', 'hide'] as const;

const CardSettingsView = ({ navigation }: Props) => {
  const { configuration, update } = useAppContext();
  const existing = configuration.cardSettings ?? {};

  const [holderNameRequired, setHolderNameRequired] = useState(
    existing.holderNameRequired ?? false
  );
  const [addressVisibility, setAddressVisibility] = useState<
    CardSettings['addressVisibility']
  >(existing.addressVisibility ?? 'lookup');
  const [showStorePaymentField, setShowStorePaymentField] = useState(
    existing.showStorePaymentField ?? true
  );
  const [hideCvcStoredCard, setHideCvcStoredCard] = useState(
    existing.hideCvcStoredCard ?? false
  );
  const [hideCvc, setHideCvc] = useState(existing.hideCvc ?? false);
  const [kcpVisibility, setKcpVisibility] = useState<
    CardSettings['kcpVisibility']
  >(existing.kcpVisibility ?? 'hide');
  const [socialSecurity, setSocialSecurity] = useState<
    CardSettings['socialSecurity']
  >(existing.socialSecurity ?? 'hide');

  const saveAndGoBack = useCallback(() => {
    update({
      cardSettings: {
        holderNameRequired,
        addressVisibility,
        showStorePaymentField,
        hideCvcStoredCard,
        hideCvc,
        kcpVisibility,
        socialSecurity,
      },
    });
    navigation.goBack();
  }, [
    update,
    navigation,
    holderNameRequired,
    addressVisibility,
    showStorePaymentField,
    hideCvcStoredCard,
    hideCvc,
    kcpVisibility,
    socialSecurity,
  ]);

  return (
    <ScrollView style={Styles.page}>
      <FormToggle
        title="Holder Name Required"
        value={holderNameRequired}
        onValueChange={setHolderNameRequired}
      />
      <FormDropdown
        title="Address Visibility"
        value={addressVisibility ?? 'lookup'}
        options={[...addressModes]}
        onChange={setAddressVisibility}
      />
      <FormToggle
        title="Show Store Payment Field"
        value={showStorePaymentField}
        onValueChange={setShowStorePaymentField}
      />
      <FormToggle
        title="Hide CVC (Stored Card)"
        value={hideCvcStoredCard}
        onValueChange={setHideCvcStoredCard}
      />
      <FormToggle title="Hide CVC" value={hideCvc} onValueChange={setHideCvc} />
      <FormDropdown
        title="KCP Visibility"
        value={kcpVisibility ?? 'hide'}
        options={[...fieldVisibilities]}
        onChange={setKcpVisibility}
      />
      <FormDropdown
        title="Social Security"
        value={socialSecurity ?? 'hide'}
        options={[...fieldVisibilities]}
        onChange={setSocialSecurity}
      />
      <View style={Styles.formAction}>
        <Button title="Save" onPress={saveAndGoBack} />
      </View>
    </ScrollView>
  );
};

export default CardSettingsView;
