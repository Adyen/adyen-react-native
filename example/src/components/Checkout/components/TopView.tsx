import { View, Text, useColorScheme } from 'react-native';
import { useAppContext } from '../../../hooks/useAppContext';
import Styles from '../../utilities/Styles';
import { getFlagEmoji } from '../utils/getFlagEmoji';
import { formatMinorUnits } from '../utils/formatMinorUnits';

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

const CountryView = ({ countryCode }: { countryCode: string }) => {
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

const AmountView = ({
  amount,
  currency,
  locale,
}: {
  amount: number;
  currency: string;
  locale: string;
}) => {
  const isDarkMode = useColorScheme() === 'dark';

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
      >{`${formatMinorUnits(amount, currency, locale)}`}</Text>
    </View>
  );
};

export default TopView;
