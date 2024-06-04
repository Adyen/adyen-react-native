import React from 'react';
import { SafeAreaView, View, Button } from 'react-native';
import Styles from '../Utilities/Styles';
import { Page } from '../App';

const Home = ({ navigation }) => {
  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <Button
          onPress={() => navigation.navigate(Page.SessionsCheckout)}
          title="Checkout"
        />
        <Button
          onPress={() => navigation.navigate(Page.AdvancedCheckout)}
          title="Advanced case"
        />
        <Button
          onPress={() => navigation.navigate(Page.CustomCard)}
          title="Custom Card Integration"
        />
      </View>
    </SafeAreaView>
  );
};

export default Home;
