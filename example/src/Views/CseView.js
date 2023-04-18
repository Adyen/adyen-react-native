import React, { useCallback, useState } from 'react';
import {
  Button,
  SafeAreaView,
  TextInput,
  Text,
  View,
  Alert,
} from 'react-native';
import { AdyenCSE } from '@adyen/react-native';
import { DEFAULT_CONFIGURATION, ENVIRONMENT } from '../Configuration';
import { fetchPayments } from '../Utilities/APIClient';
import Styles from '../Utilities/Styles';

const PUBLIC_KEY = ENVIRONMENT.publicKey;

const CseView = () => {
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
        PUBLIC_KEY
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
      const result = await fetchPayments(data, DEFAULT_CONFIGURATION);
      if (result.action) {
        Alert.alert('Action');
      } else {
        Alert.alert('Payment acepted', result.resultCode);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }, []);

  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <View style={{ width: '100%' }}>
          <TextInput
            placeholder="1234 5678 9012 3456"
            maxLength={19}
            onChangeText={setNumber}
            style={{ alignSelf: 'center' }}
          />
          <View style={Styles.horizontalContent}>
            <View>
              <View style={Styles.horizontalContent}>
                <TextInput
                  placeholder="MM"
                  maxLength={2}
                  onChangeText={setExpiryMonth}
                />
                <Text> / </Text>
                <TextInput
                  placeholder="YYYY"
                  maxLength={4}
                  onChangeText={setExpiryYear}
                />
              </View>
            </View>
            <TextInput placeholder="123" maxLength={4} onChangeText={setCvv} />
          </View>
        </View>
        <Button onPress={() => tryEncryptCard()} title="Pay" />
      </View>
    </SafeAreaView>
  );
};

export default CseView;
