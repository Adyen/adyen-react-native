import { useCallback, useState } from 'react';
import { Button, View } from 'react-native';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import FormToggle from '../common/FormToggle';
import FormDropdown from './common/FormDropdown';
import PageScrollView from '../common/PageScrollView';
import type { GooglePaySettings } from '../../settings/types';
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
  const { configuration, update } = useAppContext();
  const existing = configuration.googlePaySettings ?? {};

  const [allowPrepaidCards, setAllowPrepaidCards] = useState(
    existing.allowPrepaidCards ?? true
  );
  const [allowCreditCards, setAllowCreditCards] = useState(
    existing.allowCreditCards ?? true
  );
  const [billingAddressRequired, setBillingAddressRequired] = useState(
    existing.billingAddressRequired ?? true
  );
  const [emailRequired, setEmailRequired] = useState(
    existing.emailRequired ?? true
  );
  const [shippingAddressRequired, setShippingAddressRequired] = useState(
    existing.shippingAddressRequired ?? true
  );
  const [existingPaymentMethodRequired, setExistingPaymentMethodRequired] =
    useState(existing.existingPaymentMethodRequired ?? false);
  const [totalPriceStatus, setTotalPriceStatus] = useState<
    GooglePaySettings['totalPriceStatus']
  >(existing.totalPriceStatus ?? 'FINAL');

  const saveAndGoBack = useCallback(() => {
    update({
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
    update,
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
    <PageScrollView>
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
        onChange={setTotalPriceStatus}
      />
      <View style={Styles.formAction}>
        <Button title="Save" onPress={saveAndGoBack} />
      </View>
    </PageScrollView>
  );
};

export default GooglePaySettingsView;
