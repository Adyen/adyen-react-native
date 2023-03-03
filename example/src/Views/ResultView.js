import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import Styles from '../Utilities/Styles';

const Result = ({ route }) => {
  return (
    <SafeAreaView style={Styles.page}>
      <Text>{route.params.result}</Text>
    </SafeAreaView>
  );
};

export default Result;
