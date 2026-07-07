import { useCallback, useState } from 'react';
import { Button, View } from 'react-native';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import FormToggle from '../common/FormToggle';
import FormTextInput from '../common/FormTextInput';
import FormDropdown from './common/FormDropdown';
import PageScrollView from '../common/PageScrollView';
import { ENVIRONMENT } from '../../Configuration';
import type { ApplePaySettings } from '../../settings/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './SettingsNavigator';

type Props = NativeStackScreenProps<SettingsStackParamList, 'ApplePaySettings'>;

const shippingTypes = [
  'shipping',
  'delivery',
  'storePickup',
  'servicePickup',
] as const;

const ApplePaySettingsView = ({ navigation }: Props) => {
  const { configuration, update } = useAppContext();
  const existing = configuration.applePaySettings ?? {};

  const [merchantID, setMerchantID] = useState(
    existing.merchantID ?? ENVIRONMENT.applepayMerchantID
  );
  const [merchantName, setMerchantName] = useState(existing.merchantName ?? '');
  const [allowOnboarding, setAllowOnboarding] = useState(
    existing.allowOnboarding ?? false
  );
  const [shippingType, setShippingType] = useState<
    ApplePaySettings['shippingType']
  >(existing.shippingType ?? 'shipping');
  const [debitOnly, setDebitOnly] = useState(
    existing.merchantCapabilities?.length === 1 &&
      existing.merchantCapabilities[0] === 'debit'
  );

  const saveAndGoBack = useCallback(() => {
    update({
      applePaySettings: {
        merchantID: merchantID || undefined,
        merchantName: merchantName || undefined,
        allowOnboarding,
        shippingType,
        merchantCapabilities: debitOnly ? ['debit'] : undefined,
      },
    });
    navigation.goBack();
  }, [
    update,
    navigation,
    merchantID,
    merchantName,
    allowOnboarding,
    shippingType,
    debitOnly,
  ]);

  return (
    <PageScrollView>
      <FormTextInput
        title="Merchant ID"
        value={merchantID}
        onChangeText={setMerchantID}
      />
      <FormTextInput
        title="Merchant Name"
        value={merchantName}
        onChangeText={setMerchantName}
      />
      <FormToggle
        title="Allow Onboarding"
        value={allowOnboarding}
        onValueChange={setAllowOnboarding}
      />
      <FormDropdown
        title="Shipping Type"
        value={shippingType ?? 'shipping'}
        options={[...shippingTypes]}
        onChange={setShippingType}
      />
      <FormToggle
        title="Debit Cards Only"
        value={debitOnly}
        onValueChange={setDebitOnly}
      />
      <View style={Styles.formAction}>
        <Button title="Save" onPress={saveAndGoBack} />
      </View>
    </PageScrollView>
  );
};

export default ApplePaySettingsView;
