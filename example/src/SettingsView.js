import React, { useCallback, useState } from 'react';
import { usePaymentMethods } from './PaymentMethodsProvider';

import { Button, SafeAreaView, Text, TextInput, View, useColorScheme } from 'react-native';

const FormTextInput = ({ value, title, onChangeText, ...rest }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={{ margin: 8 }}>
      <Text>{title}</Text>
      <TextInput
        {...rest} // Inherit any props passed to it; e.g., multiline, numberOfLines below
        editable
        maxLength={40}
        placeholder=""
        value={value}
        onChangeText={onChangeText}
        style={{
          backgroundColor: isDarkMode ? 'grey' : 'lightgrey',
          padding: 8,
          borderRadius: 8,
        }}
      />
    </View>
  );
};

const SettingFormView = ({ navigation: { goBack } }) => {
  const { config, refreshPaymentMethods } = usePaymentMethods();

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
      <Button title="Apply" onPress={handleOnPress} />
    </View>
  );
};

const SettingView = ({ navigation }) => {
  return (
    <SafeAreaView style={[{ flex: 1 }]}>
      <SettingFormView navigation={navigation} />
    </SafeAreaView>
  );
};

export default SettingView;