import React, { useCallback, useState } from 'react';
import { useAppContext } from '../Utilities/AppContext';
import Styles from '../Utilities/Styles';
import {
  Button,
  SafeAreaView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

const FormTextInput = ({ value, title, onChangeText, ...rest }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={Styles.item}>
      <Text style={Styles.itemTitle}>{title}</Text>
      <TextInput
        {...rest} // Inherit any props passed to it; e.g., multiline, numberOfLines below
        editable
        maxLength={40}
        placeholder=""
        value={value}
        onChangeText={onChangeText}
        style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
      />
    </View>
  );
};

const SettingFormView = ({ navigation: { goBack } }) => {
  const { config, refreshPaymentMethods } = useAppContext();

  const [countryCode, setCountryCode] = useState(config.countryCode);
  const [amount, setAmount] = useState(config.amount.value);
  const [currency, setCurrency] = useState(config.amount.currency);
  const [merchantAccount, setMerchantAccount] = useState(
    config.merchantAccount
  );
  const [shopperLocale, setShopperLocale] = useState(config.shopperLocale);

  const handleOnPress = useCallback(() => {
    const newConfiguration = {
      ...config,
      countryCode: countryCode,
      amount: {
        currency: currency,
        value: amount,
      },
      merchantAccount: merchantAccount,
      shopperLocale: shopperLocale,
    };
    refreshPaymentMethods(newConfiguration);
    goBack();
  }, [
    countryCode,
    currency,
    amount,
    merchantAccount,
    shopperLocale,
    refreshPaymentMethods,
    config,
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
        onChangeText={setAmount}
      />
      <FormTextInput
        title="Merchant Account"
        value={merchantAccount}
        onChangeText={setMerchantAccount}
      />
      <FormTextInput
        title="Shopper locale"
        value={shopperLocale}
        onChangeText={setShopperLocale}
      />
      <Button title="Refresh payment methods" onPress={handleOnPress} />
    </View>
  );
};

const SettingView = ({ navigation }) => {
  return (
    <SafeAreaView style={Styles.page}>
      <SettingFormView navigation={navigation} />
    </SafeAreaView>
  );
};

export default SettingView;
