import React from 'react';
import { Button, SafeAreaView } from 'react-native';
import { NativeModules } from 'react-native';
import { ENVIRONMENT } from './Configuration';

const { AdyenCSE } = NativeModules;

const CseView = () => {
  const tryEncrypt = () => {
    let unencryptedCard = {
      number: '5454 5454 5454 5454',
      expiration: '03/30',
      cvc: '737',
    };
    let publicKey = ENVIRONMENT.publicKey;
    AdyenCSE.encryptCard(unencryptedCard, publicKey);
  };

  return (
    <SafeAreaView
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Button onPress={() => tryEncrypt()} title="Encrypt" />
    </SafeAreaView>
  );
};

export default CseView;
