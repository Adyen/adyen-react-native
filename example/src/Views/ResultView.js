import React from 'react';
import { SafeAreaView, Text, useColorScheme, View } from 'react-native';
import Styles from '../Utilities/Styles';

const Result = ({ route }) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <Text
          style={[
            isDarkMode ? Styles.textDark : Styles.textLight,
            Styles.centeredText,
          ]}
        >
          {route.params.result}
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default Result;
