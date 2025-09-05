import { Text, View } from 'react-native';
import Styles from '../Utilities/Styles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../State/RootStackParamList';

export type ResultViewProps = NativeStackScreenProps<
  RootStackParamList,
  'Result'
>;

const ResultView = ({ route }: ResultViewProps) => {
  return (
    <View style={Styles.content}>
      <Text style={[Styles.textLight, Styles.centeredText]}>
        {route.params.resultCode}
      </Text>
    </View>
  );
};

export default ResultView;
