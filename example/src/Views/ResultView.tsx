import React from 'react';
import { SafeAreaView, Text, View } from 'react-native';
import Styles from '../Utilities/Styles';
import { ResultScreenProps } from '../@types/navigation';

const Result = ({ route }: ResultScreenProps) => {
  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <Text style={Styles.centeredText}>{route.params.result}</Text>
      </View>
    </SafeAreaView>
  );
};

export default Result;
