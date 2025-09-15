import { useColorScheme, View, Text } from 'react-native';
import { formatMinorUnits } from '../utils/formatMinorUnits';
import Styles from '../../utilities/Styles';

interface AmountViewProps {
  amount: number;
  currency: string;
  locale: string;
}

const AmountView = ({ amount, currency, locale }: AmountViewProps) => {
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

export default AmountView;
