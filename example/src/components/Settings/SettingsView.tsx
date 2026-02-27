import { useCallback, useMemo, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import { Button, ScrollView, View } from 'react-native';
import FormTextInput from '../common/FormTextInput';

const SettingView = () => {
  const { configuration, save, navigateToRoot } = useAppContext();

  const [countryCode, setCountryCode] = useState(configuration.countryCode);
  const [amount, setAmount] = useState(String(configuration.amount));
  const [currency, setCurrency] = useState(configuration.currency);
  const [merchantName, setMerchantName] = useState(configuration.merchantName);
  const [merchantAccount, setMerchantAccount] = useState(
    configuration.merchantAccount
  );
  const [shopperReference, setShopperReference] = useState(
    configuration.shopperReference
  );
  const [shopperLocale, setShopperLocale] = useState(
    configuration.shopperLocale
  );

  const settings = useMemo(
    () => ({
      countryCode: countryCode,
      amount: Number(amount),
      currency: currency,
      merchantAccount: merchantAccount,
      merchantName: merchantName,
      shopperLocale: shopperLocale,
      shopperReference: shopperReference,
    }),
    [
      countryCode,
      amount,
      currency,
      merchantAccount,
      merchantName,
      shopperLocale,
      shopperReference,
    ]
  );

  const saveAndClose = useCallback(() => {
    save(settings);
    navigateToRoot();
  }, [settings, save, navigateToRoot]);

  return (
    <ScrollView style={Styles.page}>
      <FormTextInput
        title="Country"
        value={countryCode}
        maxLength={2}
        onChangeText={setCountryCode}
      />
      <FormTextInput
        title="Currency"
        value={currency}
        maxLength={3}
        onChangeText={setCurrency}
      />
      <FormTextInput
        title="Amount"
        value={amount.toString()}
        inputMode={'numeric'}
        onChangeText={setAmount}
      />
      <FormTextInput
        title="Merchant Account"
        value={merchantAccount}
        onChangeText={setMerchantAccount}
      />
      <FormTextInput
        title="Merchant Name"
        value={merchantName}
        onChangeText={setMerchantName}
      />
      <FormTextInput
        title="Shopper locale"
        value={shopperLocale}
        maxLength={5}
        onChangeText={setShopperLocale}
      />
      <FormTextInput
        title="Shopper Reference"
        value={shopperReference}
        onChangeText={setShopperReference}
      />
      <View style={Styles.padded}>
        <Button title="Save" onPress={saveAndClose} />
      </View>
    </ScrollView>
  );
};

export default SettingView;
