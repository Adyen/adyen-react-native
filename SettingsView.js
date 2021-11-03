import React from 'react';
import { Colors } from 'react-native/Libraries/NewAppScreen';

import { globalConfiguration } from './Configuration';

import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';

const styles = StyleSheet.create({
    contentView: {
      flex: 1,
      borderRadius: 5,
      justifyContent: "center",
    }
  });

const FormTextInput = (props) => {

    const [value, onChangeText] = React.useState(props.value);

    return (
        <View style={{ margin: 8 }}>
            <Text >{props.placeholder}</Text>
            <TextInput
                {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
                editable
                maxLength={40}
                placeholder=''
                value={value}
                onChange={text => onChangeText(text)}
                style={{ 
                    backgroundColor: 'lightgrey',
                    padding: 8,
                    borderRadius: 8
                }} />
        </View>

    );
  }

const SettingView= ({ navigation }) => {

    const isDarkMode = useColorScheme() === 'dark';
    const backgroundStyle = { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter };
  
    return (
        <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />  
            <View>
                <FormTextInput 
                    placeholder='Country' 
                    value={globalConfiguration.countryCode}
                    onChangeText={value => globalConfiguration.countryCode = value}
                    />
                <FormTextInput 
                    placeholder='Currency' 
                    value={globalConfiguration.amount.currency}
                    onChangeText={value => globalConfiguration.amount.currency = value}
                    />
                <FormTextInput 
                    placeholder='Amount' 
                    value={globalConfiguration.amount.value.toString()}
                    onChangeText={value => globalConfiguration.amount.value = parseInt(value)}
                    />
                <FormTextInput 
                    placeholder='Merchant Account' 
                    value={globalConfiguration.merchantAccount}
                    onChangeText={value => globalConfiguration.merchantAccount = value}
                    />
            </View>
        </SafeAreaView>
    )
};

export default SettingView;