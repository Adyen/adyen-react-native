import React from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { useAppContext } from '../../Utilities/AppContext';
import Styles from '../../Utilities/Styles';

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

const TopView = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const { configuration, paymentMethods } = useAppContext();

  return (
    <View>
      {paymentMethods && (
        <View style={Styles.horizontalContent}>
          <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>{`${
            configuration.amount?.value ?? 'N/A'
          } ${configuration.amount?.currency ?? 'N/A'}`}</Text>
          <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
            Country:
            {configuration.countryCode
              ? ` ${getFlagEmoji(configuration.countryCode)}`
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
