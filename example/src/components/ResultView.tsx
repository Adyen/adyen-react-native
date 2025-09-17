import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../State/RootStackParamList';
import Styles from './common/Styles';
import AdaptiveText from './common/AdaptiveText';

export type ResultViewProps = NativeStackScreenProps<
  RootStackParamList,
  'Result'
>;

const ResultView = ({ route }: ResultViewProps) => {
  return (
    <View style={Styles.centeredContent}>
      <AdaptiveText>{route.params.resultCode}</AdaptiveText>
    </View>
  );
};

export default ResultView;
