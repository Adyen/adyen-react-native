import React, { useCallback, useState } from 'react';
import {
  Button,
  SafeAreaView,
  TextInput,
  Text,
  View,
  Alert,
  useColorScheme,
} from 'react-native';
import { AdyenCSE, AdyenAction } from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';
import ApiClient from '../Utilities/APIClient';
import Styles from '../Utilities/Styles';
import { useAppContext, checkoutConfiguration } from '../Utilities/AppContext';
import { isSuccess } from '../Utilities/Helpers';

const CseView = ({ navigation }) => {
  const isDarkMode = useColorScheme() === 'dark';

  const { configuration } = useAppContext();

  const [number, setNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');

  const tryEncryptCard = useCallback(async () => {
    const unencryptedCard = {
      number: number,
      expiryMonth: expiryMonth,
      expiryYear: expiryYear,
      cvv: cvv,
    };
    try {
      const encryptedCard = await AdyenCSE.encryptCard(
        unencryptedCard,
        ENVIRONMENT.publicKey
      );
      const data = {
        paymentMethod: {
          type: 'scheme',
          encryptedCardNumber: encryptedCard.number,
          encryptedExpiryMonth: encryptedCard.expiryMonth,
          encryptedExpiryYear: encryptedCard.expiryYear,
          encryptedSecurityCode: encryptedCard.cvv,
          threeDS2SdkVersion: AdyenAction.threeDS2SdkVersion,
        },
      };

      var result = await ApiClient.payments(data, configuration, ENVIRONMENT.returnUrl);
      if (result.action) {
        const actionConfiguration = checkoutConfiguration(configuration);
        const data = await AdyenAction.handle(result.action, actionConfiguration);
        result = await ApiClient.paymentDetails(data);
      }
      handleResult(navigation, result);
    } catch (e) {
      AdyenAction.hide(isSuccess(false))
      Alert.alert('Error', e.message);
    }
  }, [configuration, cvv, expiryMonth, expiryYear, navigation, number]);

  function handleResult(navigation, result) {
    AdyenAction.hide(isSuccess(result.resultCode))
    navigation.popToTop();
    navigation.push('Result', { result: result.resultCode });
  }

  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.centeredContent}>
        <TextInput
          style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
          inputMode={'numeric'}
          placeholder={'1234 5678 9012 3456'}
          maxLength={19}
          onChangeText={setNumber}
        />
        <View style={Styles.horizontalContent}>
          <View style={Styles.horizontalContent}>
            <TextInput
              style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
              inputMode={'numeric'}
              placeholder="MM"
              maxLength={2}
              onChangeText={setExpiryMonth}
            />
            <Text
              style={[
                isDarkMode ? Styles.textDark : Styles.textLight,
                Styles.slash,
              ]}
            >{`/`}</Text>
            <TextInput
              style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
              inputMode={'numeric'}
              placeholder="YYYY"
              maxLength={4}
              onChangeText={setExpiryYear}
            />
          </View>
          <TextInput
            style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
            inputMode={'numeric'}
            placeholder="123"
            maxLength={4}
            onChangeText={setCvv}
          />
        </View>

        <Button onPress={() => tryEncryptCard()} title="Pay" />
      </View>
    </SafeAreaView>
  );
};

export default CseView;

