import { useCallback, useMemo, useState } from 'react';
import { Button, View, Alert } from 'react-native';
import { AdyenAction } from '@adyen/react-native';
import Styles from '../utilities/Styles';
import { isSuccess } from '../utilities/isSuccess';
import { payWithCard } from './utils/payWithCard';
import { useAppContext } from '../../hooks/useAppContext';
import type { PageProps } from '../../State/RootStackParamList';
import type { PaymentResponse } from '../../api/types';
import CardNumberInput from './components/CardNumberInput';
import ExpiryDateInput from './components/ExpiryDateInput';
import SecureCodeInput from './components/SecureCodeInput';

const CseView = ({ navigation }: PageProps) => {
  const { configuration } = useAppContext();
  const [number, setNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const unencryptedCard = useMemo(() => {
    const parts = expiryDate.split('/');
    const expiryMonth = parts[0];
    const expiryYear = parts[1];
    return {
      number: number.replace(/\s+/g, ''),
      expiryMonth,
      expiryYear,
      cvv,
    };
  }, [expiryDate, number, cvv]);

  const tryEncryptCard = useCallback(async () => {
    let result: PaymentResponse;
    try {
      result = await payWithCard(unencryptedCard, configuration);
    } catch (e) {
      Alert.alert('Error', String(e));
      return;
    }
    AdyenAction.hide(isSuccess(result.resultCode));
    navigation.popToTop();
    navigation.push('Result', { resultCode: result.resultCode });
  }, [configuration, navigation, unencryptedCard]);

  return (
    <View style={Styles.centeredContent}>
      <CardNumberInput onChangeText={setNumber} />
      <View style={Styles.horizontalContent}>
        <ExpiryDateInput onChangeText={setExpiryDate} />
        <SecureCodeInput bin={number.slice(0, 8)} onChangeText={setCvv} />
      </View>

      <Button onPress={() => tryEncryptCard()} title="Pay" />
    </View>
  );
};

export default CseView;
