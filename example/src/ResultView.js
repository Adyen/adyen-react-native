import React from 'react';
import { SafeAreaView, Text } from 'react-native';

const Result = ({ route }) => {
  return (
    <SafeAreaView
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ textAlign: 'center' }}>{route.params.result}</Text>
    </SafeAreaView>
  );
};

export default Result;
