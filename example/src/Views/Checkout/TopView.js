import React from 'react';
import { View, Text } from 'react-native';
import { useAppContext } from '../../Utilities/AppContext';
import Styles from '../../Utilities/Styles';

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const TopView = () => {
  const { configuration, paymentMethods } = useAppContext();

  return (
    <View>
      {paymentMethods ? (
        <View style={Styles.horizontalContent}>
          <Text>{`${configuration.amount} ${configuration.currency}`}</Text>
          <Text>Country: {getFlagEmoji(configuration.countryCode)}</Text>
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
