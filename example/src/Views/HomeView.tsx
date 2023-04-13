import React from 'react';
import { SafeAreaView, View, Button } from 'react-native';
import Styles from '../Utilities/Styles';
import { HomeScreenProps } from '../@types/navigation';

const Home = ({ navigation }: HomeScreenProps) => {
  return (
    <SafeAreaView style={Styles.page}>
      <View style={Styles.content}>
        <Button
          onPress={() => navigation.navigate('Checkout')}
          title="Checkout"
        />
        <View style={Styles.item} />
        <Button
          onPress={() => navigation.navigate('CSE')}
          title="Clientside Encryption"
        />
      </View>
    </SafeAreaView>
  );
};

export default Home;
