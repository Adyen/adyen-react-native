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
  const { configuration } = useAppContext();

  return (
    <View style={Styles.horizontalContent}>
      <AmountView amount={configuration.amount} />
      <CountryView countryCode={configuration.countryCode} />
    </View>
  );
};

const AmountView = ({ amount }) => {
  const isDarkMode = useColorScheme() === 'dark';

  if (!amount) {
    return (
      <View style={Styles.content}>
        <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
          Amount not defined
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.content}>
      <Text
        style={isDarkMode ? Styles.textDark : Styles.textLight}
      >{`${amount.value} ${amount.currency}`}</Text>
    </View>
  );
};

const CountryView = ({ countryCode }) => {
  const isDarkMode = useColorScheme() === 'dark';

  if (!countryCode) {
    return (
      <View style={Styles.content}>
        <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
          Country not defined
        </Text>
      </View>
    );
  }
  return (
    <View style={Styles.content}>
      <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
        {`Country: ${getFlagEmoji(countryCode)}`}
      </Text>
    </View>
  );
};

export default TopView;
