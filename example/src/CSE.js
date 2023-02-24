import React from 'react';
import { Button, SafeAreaView } from 'react-native';
import { NativeModules } from 'react-native';
import { ENVIRONMENT } from './Configuration';
import Styles from './Styles';

const { AdyenCSE } = NativeModules;

const CseView = () => {
  const tryEncryptCard = async () => {
    let unencryptedCard = {
      number: '5454 5454 5454 5454',
      expiryMonth: '03',
      expiryYear: '2030',
      cvv: '737',
    };
    let publicKey = ENVIRONMENT.publicKey;
    try {
      const encryptedCard = await AdyenCSE.encryptCard(
        unencryptedCard,
        publicKey
      );
      console.log(JSON.stringify(encryptedCard));
    } catch (e) {
      console.error(e);
    }
  };

  const tryEncryptBin = async () => {
    let publicKey = ENVIRONMENT.publicKey;
    try {
      const encryptBin = await AdyenCSE.encryptBin(
        '5454 5454 5454 5454',
        publicKey
      );
      console.log(encryptBin);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={Styles.page}>
      <Button onPress={() => tryEncryptCard()} title="Encrypt Card" />
      <Button onPress={() => tryEncryptBin()} title="Encrypt Bin" />
    </SafeAreaView>
  );
};

export default CseView;
