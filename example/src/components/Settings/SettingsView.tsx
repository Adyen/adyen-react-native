// @ts-check

import { useCallback, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../utilities/Styles';
import { Button, View } from 'react-native';
import FormTextInput from './components/FormTextInput';
import type { PageProps } from '../../State/RootStackParamList';

const SettingView = ({ navigation: { goBack } }: PageProps) => {
  const { configuration, save } = useAppContext();

  const [countryCode, setCountryCode] = useState(configuration.countryCode);
  const [amount, setAmount] = useState(configuration.amount);
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

  const handleOnPress = useCallback(() => {
    const newConfiguration = {
      countryCode: countryCode,
      amount: Number(amount),
      currency: currency,
      merchantAccount: merchantAccount,
      merchantName: merchantName,
      shopperLocale: shopperLocale,
      shopperReference: shopperReference,
    };
    save(newConfiguration);
    goBack();
  }, [
    countryCode,
    currency,
    amount,
    merchantAccount,
    shopperLocale,
    merchantName,
    configuration,
    shopperReference,
  ]);

  return (
    <View>
      <FormTextInput
        title="Country"
        value={countryCode}
        onChangeText={setCountryCode}
      />
      <FormTextInput
        title="Currency"
        value={currency}
        onChangeText={setCurrency}
      />
      <FormTextInput
        title="Amount"
        value={amount.toString()}
        inputMode={'numeric'}
        onChangeText={(value) => setAmount(Number(value))}
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
        onChangeText={setShopperLocale}
      />
      <FormTextInput
        title="Shopper Reference"
        value={shopperReference}
        onChangeText={setShopperReference}
      />
      <View style={Styles.centeredButton}>
        <Button title="Save" onPress={handleOnPress} />
      </View>
    </View>
  );
};

export default SettingView;
