import { Text, useColorScheme, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../State/RootStackParamList';
import Styles from './utilities/Styles';

export type ResultViewProps = NativeStackScreenProps<
  RootStackParamList,
  'Result'
>;

const ResultView = ({ route }: ResultViewProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={Styles.content}>
      <Text
        style={[
          isDarkMode ? Styles.textDark : Styles.textLight,
          Styles.centeredText,
        ]}
      >
        {route.params.resultCode}
      </Text>
    </View>
  );
};

export default ResultView;
