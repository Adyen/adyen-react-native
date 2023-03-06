import React from 'react';
import { View, Text } from 'react-native';
import { usePaymentMethods } from '../../Utilities/PaymentMethodsProvider';
import Styles from '../../Utilities/Styles';

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const TopView = () => {
  const { config, paymentMethods } = usePaymentMethods();

  return (
    <View>
      {paymentMethods ? (
        <View style={Styles.horizontalContent}>
          <Text>{`${config.amount.value} ${config.amount.currency}`}</Text>
          <Text>Country: {getFlagEmoji(config.countryCode)}</Text>
        </View>
      ) : (
        <View style={Styles.horizontalContent}>
          <Text>No PaymentMethods</Text>
        </View>
      )}
    </View>
  );
};

export default TopView;
