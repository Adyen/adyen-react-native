import React, { useCallback } from 'react';
import { Button, SafeAreaView } from 'react-native';
import { NativeModules } from 'react-native';
import { ENVIRONMENT } from './Configuration';
import Styles from './Styles';

const PUBLIC_KEY = ENVIRONMENT.publicKey;

const { AdyenCSE } = NativeModules;

const CseView = () => {
  const tryEncryptCard = useCallback(async () => {
    let unencryptedCard = {
      number: '5454 5454 5454 5454',
      expiryMonth: '03',
      expiryYear: '2030',
      cvv: '737',
    };
    try {
      const encryptedCard = await AdyenCSE.encryptCard(
        unencryptedCard,
        PUBLIC_KEY
      );
      console.log(JSON.stringify(encryptedCard));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const tryEncryptBin = useCallback(async () => {
    try {
      const encryptBin = await AdyenCSE.encryptBin(
        '5454 5454 5454 5454',
        PUBLIC_KEY
      );
      console.log(encryptBin);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return (
    <SafeAreaView style={Styles.page}>
      <Button onPress={() => tryEncryptCard()} title="Encrypt Card" />
      <Button onPress={() => tryEncryptBin()} title="Encrypt Bin" />
    </SafeAreaView>
  );
};

export default CseView;
