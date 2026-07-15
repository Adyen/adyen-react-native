import { Button, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../router/RootStackNavigator';
import Styles from './common/Styles';
import AdaptiveText from './common/AdaptiveText';
import { useAppContext } from '../hooks/useAppContext';

export type ResultViewProps = NativeStackScreenProps<
  RootStackParamList,
  'Result'
>;

const ResultView = ({ route }: ResultViewProps) => {
  const { navigateToRoot } = useAppContext();

  return (
    <View style={Styles.centeredContent}>
      <AdaptiveText testID="result-code">
        {route.params.resultCode}
      </AdaptiveText>
      <View style={Styles.padded}>
        <Button title="Back to Home" onPress={() => navigateToRoot()} />
      </View>
    </View>
  );
};

export default ResultView;
