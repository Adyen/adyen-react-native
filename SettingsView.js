import React from 'react';
import { Colors } from 'react-native/Libraries/NewAppScreen';
import { PaymentMethodsContext } from './PaymentMethodsProvider';

import {
    Button,
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

const SettingView = () => {

    const isDarkMode = useColorScheme() === 'dark';
    const backgroundStyle = { backgroundColor: isDarkMode ? Colors.darker : Colors.lighter };
    let tempContext = {};
    return (
        <PaymentMethodsContext.Consumer>
            { context => (
                <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
                    <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />  
                    <View>
                        <FormTextInput 
                            placeholder='Country' 
                            value={context.config.countryCode}
                            onChangeText={value => tempContext.countryCode = value }
                            />
                        <FormTextInput 
                            placeholder='Currency' 
                            value={context.config.amount.currency}
                            onChangeText={value => tempContext.currency = value}
                            />
                        <FormTextInput 
                            placeholder='Amount' 
                            value={context.config.amount.value.toString()}
                            onChangeText={value => tempContext.value = parseInt(value)}
                            />
                        <FormTextInput 
                            placeholder='Merchant Account' 
                            value={context.config.merchantAccount}
                            onChangeText={value => tempContext.merchantAccount = value}
                            />
                        <FormTextInput 
                            placeholder='Shopper locale' 
                            value={context.config.shopperLocale}
                            onChangeText={value => tempContext.shopperLocale = value}
                            />
                        <Button
                            title="Apply"
                            onPress={ () => {
                                let newConfig = JSON.parse(JSON.stringify(context.config));
                                    newConfig.countryCode = tempContext.countryCode || context.config.countryCode;
                                    newConfig.amount.currency = tempContext.currency || context.config.amount.currency;
                                    newConfig.amount.value = tempContext.value || context.config.amount.value;
                                    newConfig.merchantAccount = tempContext.merchantAccount || context.config.merchantAccount;
                                    newConfig.shopperLocale = tempContext.shopperLocale || context.config.shopperLocale;
                                context.onConfigChanged(newConfig) 
                                } } />
                    </View>
                </SafeAreaView>
            )}
        </PaymentMethodsContext.Consumer>
    )
};

export default SettingView;