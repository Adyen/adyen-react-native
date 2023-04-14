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
import { AdyenCSE } from '@adyen/react-native';
import { ENVIRONMENT } from '../Configuration';
import ApiClient from '../Utilities/APIClient';
import Styles from '../Utilities/Styles';
import { CSEScreenProps } from '../@types/navigation';
import { usePaymentMethods } from '../Utilities/PaymentMethodsProvider';

const PUBLIC_KEY = ENVIRONMENT.publicKey;

const CseView = ({ navigation, route }: CSEScreenProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  const { config } = usePaymentMethods();

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
        PUBLIC_KEY,
      );

      const data = {
        paymentMethod: {
          type: 'scheme',
          encryptedCardNumber: encryptedCard.number,
          encryptedExpiryMonth: encryptedCard.expiryMonth,
          encryptedExpiryYear: encryptedCard.expiryYear,
          encryptedSecurityCode: encryptedCard.cvv,
        },
      };

      const result = await ApiClient.payments(data, config);
      if (result.action) {
        Alert.alert('Action');
      } else {
        Alert.alert('Payment acepted', result.resultCode);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  }, [config, cvv, expiryMonth, expiryYear, number]);

  const tryEncryptBin = useCallback(async () => {
    try {
      const encryptBin = await AdyenCSE.encryptBin(
        '5454 5454 5454 5454',
        PUBLIC_KEY,
      );
      console.log(encryptBin);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
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
            <Text style={Styles.slash}>{`/`}</Text>
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
