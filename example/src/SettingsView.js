import React, { useState } from 'react';
import { usePaymentMethods } from './PaymentMethodsProvider';

import {
  Button,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';

const FormTextInput = (props) => {

  const { value, placeholder } = props;
  const [currentValue, onChangeText] = useState(value);

  return (
    <View style={{ margin: 8 }}>
      <Text>{placeholder}</Text>
      <TextInput
        {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
        editable
        maxLength={40}
        placeholder=""
        value={currentValue}
        onChange={(text) => onChangeText(text)}
        style={{
          backgroundColor: 'lightgrey',
          padding: 8,
          borderRadius: 8,
        }}
      />
    </View>
  );
};

const SettingFormView = ({ navigation: { goBack } }) => {

  const { config, onConfigChanged } = usePaymentMethods();

  var defaultValue = {
    ...config,
    countryCode: config.countryCode,
    amount: {
      currency: config.amount.currency,
      value: config.amount.value,
    },
    merchantAccount: config.merchantAccount,
    shopperLocale: config.shopperLocale,
  };

  return (
    <View>
      <FormTextInput
        placeholder="Country"
        value={defaultValue.countryCode}
        onChangeText={(value) => {
          console.log('changing');
          defaultValue.countryCode = value;
        }}
      />
      <FormTextInput
        placeholder="Currency"
        value={defaultValue.amount.currency}
        onChangeText={(value) => defaultValue.amount.currency = value }
      />
      <FormTextInput
        placeholder="Amount"
        value={defaultValue.amount.value.toString()}
        onChangeText={(value) => defaultValue.amount.value = value }
      />
      <FormTextInput
        placeholder="Merchant Account"
        value={defaultValue.merchantAccount}
        onChangeText={(value) => defaultValue.merchantAccount = value}
      />
      <FormTextInput
        placeholder="Shopper locale"
        value={defaultValue.shopperLocale}
        onChangeText={(value) => defaultValue.shopperLocale = value}
      />
      <Button
        title="Apply"
        onPress={() => {
          onConfigChanged(defaultValue);
          goBack()
        }}
      />
    </View>
  );
};

const SettingView = ({navigation}) => {
  return (
    <SafeAreaView style={[{ flex: 1 }]}>
      <SettingFormView navigation={navigation} />
    </SafeAreaView>
  );
};

export default SettingView;
