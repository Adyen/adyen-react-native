import React, { useCallback, useState } from 'react';
import { usePaymentMethods } from '../Utilities/PaymentMethodsProvider';
import Styles from '../Utilities/Styles';
import {
  Button,
  SafeAreaView,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SettingsScreenProps } from '../@types/navigation';
import { useNavigation } from '@react-navigation/native';
import { TextInputProps } from 'react-native/Libraries/Components/TextInput/TextInput';
import { Configuration } from '@adyen/react-native';

type FormTextInputProps = {
  title: string;
} & TextInputProps;
const FormTextInput = (props: FormTextInputProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={Styles.item}>
      <Text style={Styles.itemTitle}>{props.title}</Text>
      <TextInput
        {...props}
        editable
        maxLength={40}
        placeholder=""
        style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
      />
    </View>
  );
};

const SettingFormView = () => {
  const navigation = useNavigation();
  const { config, refreshPaymentMethods } = usePaymentMethods();

  const [countryCode, setCountryCode] = useState(config.countryCode);
  const [amount, setAmount] = useState(config.amount?.value ?? 0);
  const [currency, setCurrency] = useState(config.amount?.currency ?? 'EUR');

  const handleOnPress = useCallback(() => {
    const newConfiguration: Configuration = {
      ...config,
      countryCode: countryCode,
      amount: {
        currency: currency,
        value: amount,
      },
    };
    refreshPaymentMethods(newConfiguration);
    navigation.goBack();
  }, [
    config,
    countryCode,
    currency,
    amount,
    refreshPaymentMethods,
    navigation,
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
        value={amount?.toString()}
        inputMode={'numeric'}
        onChangeText={text => setAmount(Number(text))}
      />

      <View style={Styles.centeredButton}>
        <Button title="Refresh payment methods" onPress={handleOnPress} />
      </View>
    </View>
  );
};

const SettingView = ({ navigation, route }: SettingsScreenProps) => {
  return (
    <SafeAreaView style={Styles.page}>
      <SettingFormView />
    </SafeAreaView>
  );
};

export default SettingView;
