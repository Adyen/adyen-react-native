import React, { useCallback } from 'react';
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
      <AmountView
        amount={configuration.amount}
        currency={configuration.currency}
        locale={configuration.shopperLocale}
      />
      <CountryView countryCode={configuration.countryCode} />
    </View>
  );
};

const CountryView = ({ countryCode }) => {
  const isDarkMode = useColorScheme() === 'dark';

  if (!countryCode) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
          Country not defined
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.centeredContent}>
      <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
        {`Country: ${getFlagEmoji(countryCode)}`}
      </Text>
    </View>
  );
};

const AmountView = ({ amount, currency, locale }) => {
  const isDarkMode = useColorScheme() === 'dark';

  const formatMinorUnits = useCallback(
    (amount) => {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
      });

      switch (currency) {
        case 'BHD':
        case 'KWD':
          amount = amount / 1000;
        case 'JPY':
        case 'IDR':
          amount = amount;
          break;
        default:
          amount = amount / 100;
      }

      return formatter.format(amount);
    },
    [locale, currency]
  );

  if (!amount) {
    return (
      <View style={Styles.centeredContent}>
        <Text style={isDarkMode ? Styles.textDark : Styles.textLight}>
          Amount not defined
        </Text>
      </View>
    );
  }

  return (
    <View style={Styles.centeredContent}>
      <Text
        style={isDarkMode ? Styles.textDark : Styles.textLight}
      >{`${formatMinorUnits(amount)}`}</Text>
    </View>
  );
};

export default TopView;
