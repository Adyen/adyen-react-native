import { View } from 'react-native';
import { useAppContext } from '../../../hooks/useAppContext';
import Styles from '../../utilities/Styles';
import AmountView from './AmountView';
import CountryView from './CountryView';

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

export default TopView;
