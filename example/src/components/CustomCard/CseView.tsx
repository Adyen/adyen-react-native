import { useCallback, useMemo, useState } from 'react';
import { Button, View, Alert, ScrollView } from 'react-native';
import { AdyenAction, AdyenCSE } from '@adyen/react-native';
import Styles from '../common/Styles';
import { payWithCard } from './utils/payWithCard';
import { useAppContext } from '../../hooks/useAppContext';
import type { PaymentResponse } from '../../api/types';
import CardNumberInput from './components/CardNumberInput';
import ExpiryDateInput from './components/ExpiryDateInput';
import SecureCodeInput from './components/SecureCodeInput';
import { formatMinorUnits } from '../utilities/formatMinorUnits';

const CARD_VALIDATION_ERROR_TITLE = 'Invalid card details';

const CseView = () => {
  const { configuration, processResult, apiClient } = useAppContext();
  const [number, setNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const unencryptedCard = useMemo(() => {
    const parts = expiryDate.split('/');
    const expiryMonth = parts[0] ?? '';
    const expiryYear = parts[1] ? '20' + parts[1] : '';
    return {
      number: number.replace(/\s+/g, ''),
      expiryMonth,
      expiryYear,
      cvv,
    };
  }, [expiryDate, number, cvv]);

  const validateCardData = useCallback(async (): Promise<string | null> => {
    const isCardNumberValid = await AdyenCSE.validateCardNumber(
      unencryptedCard.number ?? '',
      true
    );
    if (!isCardNumberValid) {
      return 'Please provide a valid card number.';
    }

    const isExpiryDateValid = await AdyenCSE.validateCardExpiryDate(
      unencryptedCard.expiryMonth ?? '',
      unencryptedCard.expiryYear ?? ''
    );
    if (!isExpiryDateValid) {
      return 'Please provide a valid expiry date.';
    }

    const isSecurityCodeValid = await AdyenCSE.validateCardSecurityCode(
      unencryptedCard.cvv ?? ''
    );
    if (!isSecurityCodeValid) {
      return 'Please provide a valid security code.';
    }

    return null;
  }, [unencryptedCard]);

  const tryEncryptCard = useCallback(async () => {
    let result: PaymentResponse;
    try {
      const validationError = await validateCardData();
      if (validationError) {
        Alert.alert(CARD_VALIDATION_ERROR_TITLE, validationError);
        return;
      }
      result = await payWithCard(unencryptedCard, configuration, apiClient);
      processResult(result, AdyenAction);
    } catch (e) {
      Alert.alert('Error', String(e));
      return;
    }
  }, [
    configuration,
    unencryptedCard,
    processResult,
    apiClient,
    validateCardData,
  ]);

  const amountLabel = useMemo(() => {
    return formatMinorUnits(
      configuration.amount,
      configuration.currency,
      configuration.shopperLocale
    );
  }, [configuration]);

  return (
    <ScrollView style={[Styles.page, Styles.padded]}>
      <CardNumberInput onChangeText={setNumber} style={Styles.padded} />
      <View style={[Styles.horizontalContent]}>
        <ExpiryDateInput onChangeText={setExpiryDate} />
        <View style={Styles.horizontalSpace} />
        <SecureCodeInput bin={number.slice(0, 8)} onChangeText={setCvv} />
      </View>

      <View style={[Styles.topPadded]}>
        <Button onPress={() => tryEncryptCard()} title={'Pay ' + amountLabel} />
      </View>
    </ScrollView>
  );
};

export default CseView;
