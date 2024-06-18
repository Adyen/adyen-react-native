// @ts-check

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
import { ENVIRONMENT } from '../Configuration';

const FormTextInput = ({ value, title, onChangeText, ...rest }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={Styles.item}>
      <Text
        style={[
          isDarkMode ? Styles.textDark : Styles.textLight,
          Styles.itemTitle,
        ]}
      >
        {title}
      </Text>
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
      amount: amount,
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

const SettingView = ({ navigation }) => {
  return (
    <SafeAreaView style={Styles.page}>
      <SettingFormView navigation={navigation} />
    </SafeAreaView>
  );
};

export default SettingView;
