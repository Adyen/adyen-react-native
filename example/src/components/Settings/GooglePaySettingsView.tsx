import { useCallback, useState } from 'react';
import { Button, ScrollView, View } from 'react-native';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import FormToggle from '../common/FormToggle';
import FormDropdown from '../common/FormDropdown';
import type { GooglePaySettings } from '../../api/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './SettingsNavigator';

type Props = NativeStackScreenProps<
  SettingsStackParamList,
  'GooglePaySettings'
>;

const totalPriceStatuses = [
  'NOT_CURRENTLY_KNOWN',
  'ESTIMATED',
  'FINAL',
] as const;

const GooglePaySettingsView = ({ navigation }: Props) => {
  const { configuration, save } = useAppContext();
  const existing = configuration.googlePaySettings ?? {};

  const [allowPrepaidCards, setAllowPrepaidCards] = useState(
    existing.allowPrepaidCards ?? true
  );
  const [allowCreditCards, setAllowCreditCards] = useState(
    existing.allowCreditCards ?? true
  );
  const [billingAddressRequired, setBillingAddressRequired] = useState(
    existing.billingAddressRequired ?? false
  );
  const [emailRequired, setEmailRequired] = useState(
    existing.emailRequired ?? false
  );
  const [shippingAddressRequired, setShippingAddressRequired] = useState(
    existing.shippingAddressRequired ?? false
  );
  const [existingPaymentMethodRequired, setExistingPaymentMethodRequired] =
    useState(existing.existingPaymentMethodRequired ?? false);
  const [totalPriceStatus, setTotalPriceStatus] = useState<
    GooglePaySettings['totalPriceStatus']
  >(existing.totalPriceStatus ?? 'FINAL');

  const saveAndGoBack = useCallback(() => {
    save({
      ...configuration,
      googlePaySettings: {
        allowPrepaidCards,
        allowCreditCards,
        billingAddressRequired,
        emailRequired,
        shippingAddressRequired,
        existingPaymentMethodRequired,
        totalPriceStatus,
      },
    });
    navigation.goBack();
  }, [
    configuration,
    save,
    navigation,
    allowPrepaidCards,
    allowCreditCards,
    billingAddressRequired,
    emailRequired,
    shippingAddressRequired,
    existingPaymentMethodRequired,
    totalPriceStatus,
  ]);

  return (
    <ScrollView style={Styles.page}>
      <FormToggle
        title="Allow Prepaid Cards"
        value={allowPrepaidCards}
        onValueChange={setAllowPrepaidCards}
      />
      <FormToggle
        title="Allow Credit Cards"
        value={allowCreditCards}
        onValueChange={setAllowCreditCards}
      />
      <FormToggle
        title="Billing Address Required"
        value={billingAddressRequired}
        onValueChange={setBillingAddressRequired}
      />
      <FormToggle
        title="Email Required"
        value={emailRequired}
        onValueChange={setEmailRequired}
      />
      <FormToggle
        title="Shipping Address Required"
        value={shippingAddressRequired}
        onValueChange={setShippingAddressRequired}
      />
      <FormToggle
        title="Existing Payment Method Required"
        value={existingPaymentMethodRequired}
        onValueChange={setExistingPaymentMethodRequired}
      />
      <FormDropdown
        title="Total Price Status"
        value={totalPriceStatus ?? 'FINAL'}
        options={[...totalPriceStatuses]}
        onChange={(v) =>
          setTotalPriceStatus(v as GooglePaySettings['totalPriceStatus'])
        }
      />
      <View style={Styles.formAction}>
        <Button title="Save" onPress={saveAndGoBack} />
      </View>
    </ScrollView>
  );
};

export default GooglePaySettingsView;
