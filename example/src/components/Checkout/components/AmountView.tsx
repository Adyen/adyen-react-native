import { formatMinorUnits } from '../../utilities/formatMinorUnits';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import { View } from 'react-native';

interface AmountViewProps {
  amount: number;
  currency: string;
  locale: string;
}

const AmountView = ({ amount, currency, locale }: AmountViewProps) => {
  const amountLable = amount
    ? `${formatMinorUnits(amount, currency, locale)}`
    : 'Amount not defined';

  return (
    <View style={Styles.centeredContent}>
      <AdaptiveText>{amountLable}</AdaptiveText>
    </View>
  );
};

export default AmountView;
