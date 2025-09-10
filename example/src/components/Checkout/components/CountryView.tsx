import { useColorScheme, View, Text } from 'react-native';
import { getFlagEmoji } from '../utils/getFlagEmoji';
import Styles from '../../utilities/Styles';

interface CountryViewProps {
  countryCode: string;
}

const CountryView = ({ countryCode }: CountryViewProps) => {
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

export default CountryView;
