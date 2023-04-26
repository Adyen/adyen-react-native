import React from 'react';
import { SafeAreaView, View, Button } from 'react-native';
import Styles from '../Utilities/Styles';

const Home = ({ navigation }) => {
  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <View style={Styles.item}>
          <Button
            onPress={() => navigation.navigate('CheckoutPage')}
            title="Checkout"
          />
        </View>
        <View style={Styles.item}>
          <Button
            onPress={() => navigation.navigate('Clientside Encryption')}
            title="Clientside Encryption"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Home;
