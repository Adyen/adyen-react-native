import { getFlagEmoji } from '../utils/getFlagEmoji';
import Styles from '../../common/Styles';
import AdaptiveText from '../../common/AdaptiveText';
import { View } from 'react-native';

interface CountryViewProps {
  countryCode: string;
}

const CountryView = ({ countryCode }: CountryViewProps) => {
  const countryLabel = countryCode
    ? `${getFlagEmoji(countryCode)} ${countryCode}`
    : 'Country not defined';

  return (
    <View style={Styles.centeredContent}>
      <AdaptiveText>{countryLabel}</AdaptiveText>
    </View>
  );
};

export default CountryView;
