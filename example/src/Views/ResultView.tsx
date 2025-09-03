import Styles from '../Utilities/Styles';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../State/RootStackParamList';
import { View, Text } from 'react-native';
import { useEffect } from 'react';

export type ResultViewProps = NativeStackScreenProps<
  RootStackParamList,
  'Result'
>;

const ResultView = ({ route }: ResultViewProps) => {

  useEffect(
    () => {
      console.log(route.params);
    },
    [route.params.resultCode]
  )

  return (
    <View style={Styles.content}>
      <Text style={[Styles.textLight, Styles.centeredText]}>
        {route.params.resultCode}
      </Text>
    </View>
  );
};


export default ResultView;
