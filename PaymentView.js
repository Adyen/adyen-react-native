import React from 'react';

import { onOpenDropInPress, CHANNEL } from './PaymentHandling';

import {
  Button,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';

import { Colors } from 'react-native/Libraries/NewAppScreen';

const styles = StyleSheet.create({
    sectionContainer: {
      marginVertical: 32,
      borderRadius: 5,
      backgroundColor: "oldlace"
    },
    contentView: {
      flex: 1,
      borderRadius: 5,
      justifyContent: "center",
    },
    sectionTitle: {
      paddingVertical: 16,
      fontSize: 24,
      fontWeight: '600',
    },
    sectionDescription: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: '400',
    },
    highlight: {
      fontWeight: '700',
    }
  });

const PaymentView = ({ navigation }) => {
    const isDarkMode = useColorScheme() === 'dark';
  
    const backgroundStyle = { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter, };
    const contentBackgroundStyle = { backgroundColor: isDarkMode ? Colors.black : Colors.white };
    const titleStyle = { color: isDarkMode ? Colors.lighter: Colors.darker };
  
    const platformSpecificPayment = CHANNEL == 'iOS' ? "Apple Pay" : "Google Pay"
    const platformSpecificButton = 'Open ' + platformSpecificPayment + ' (WIP)'

    const onOpenSettings = () => {
        navigation.navigate();
    };
  
    return (
      <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />  
        <View style={[ { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8 } ]} >
          <Text style={[titleStyle, styles.sectionTitle]}> Adyen React Native </Text>
          <Button title="Settings" onPress={onOpenSettings} />
        </View>
        
        <View
          style={[
            styles.contentView,
            contentBackgroundStyle
          ]}>
        
            <Button
              title="Open DropIn"
              onPress={onOpenDropInPress}
            />
            <Button
              title="Open Card Component (WIP)"
              disabled="true"
            />
            <Button
              title="Open iDEAL (WIP)"
              disabled="true"
            />
            <Button
              title={platformSpecificButton}
              disabled="true"
            />
            
        </View>
      </SafeAreaView>
    );
  };
  
  export default PaymentView;