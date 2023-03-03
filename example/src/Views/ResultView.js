import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import Styles from '../Utilities/Styles';

const Result = ({ route }) => {
  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <Text>{route.params.result}</Text>
      </View>
    </SafeAreaView>
  );
};

export default Result;
