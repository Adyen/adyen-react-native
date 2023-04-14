import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { usePaymentMethods } from '../../Utilities/PaymentMethodsProvider';
import Styles from '../../Utilities/Styles';

function getFlagEmoji(countryCode: string) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const TopView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const { config, paymentMethods } = usePaymentMethods();

  return (
    <View>
      {paymentMethods && (
        <View style={Styles.horizontalContent}>
          <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>{`${
            config.amount?.value ?? 'N/A'
          } ${config.amount?.currency ?? 'N/A'}`}</Text>
          <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
            Country:
            {config.countryCode
              ? ` ${getFlagEmoji(config.countryCode)}`
              : 'N/A'}
          </Text>
        </View>
      )}
      {!paymentMethods && (
        <View style={Styles.horizontalContent}>
          <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
            No PaymentMethods
          </Text>
        </View>
      )}
    </View>
  );
};

export default TopView;
