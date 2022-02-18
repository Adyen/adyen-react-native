import React from "react";
import { Colors } from "react-native/Libraries/NewAppScreen";
import { PaymentMethodsContext } from "./PaymentMethodsProvider";

import {
  Button,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";

const FormTextInput = (props) => {
  const [value, onChangeText] = React.useState(props.value);

  return (
    <View style={{ margin: 8 }}>
      <Text>{props.placeholder}</Text>
      <TextInput
        {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
        editable
        maxLength={40}
        placeholder=""
        value={value}
        onChange={(text) => onChangeText(text)}
        style={{
          backgroundColor: "lightgrey",
          padding: 8,
          borderRadius: 8,
        }}
      />
    </View>
  );
};

const SettingFormView = (props) => {

  const [defaultValue, onChangeValue] = React.useState({
    ...props.context.config,
    countryCode: props.context.config.countryCode,
    amount: {
      currency: props.context.config.amount.currency,
      value: props.context.config.amount.value,
    },
    merchantAccount: props.context.config.merchantAccount,
    shopperLocale: props.context.config.shopperLocale,
  });

  return (
    <View>
      <FormTextInput
        placeholder="Country"
        value={defaultValue.countryCode}
        onChangeText={(value) =>
          onChangeValue({ ...defaultValue, countryCode: value })
        }
      />
      <FormTextInput
        placeholder="Currency"
        value={defaultValue.amount.currency}
        onChangeText={(value) =>
          onChangeValue({
            ...defaultValue,
            amount: { ...defaultValue.amount, currency: value },
          })
        }
      />
      <FormTextInput
        placeholder="Amount"
        value={defaultValue.amount.value.toString()}
        onChangeText={(value) =>
          onChangeValue({
            ...defaultValue,
            amount: { ...defaultValue.amount, value: value },
          })
        }
      />
      <FormTextInput
        placeholder="Merchant Account"
        value={defaultValue.merchantAccount}
        onChangeText={(value) =>
          onChangeValue({ ...defaultValue, merchantAccount: value })
        }
      />
      <FormTextInput
        placeholder="Shopper locale"
        value={defaultValue.shopperLocale}
        onChangeText={(value) =>
          onChangeValue({ ...defaultValue, shopperLocale: value })
        }
      />
      <Button
        title="Apply"
        onPress={() => {
          props.context.onConfigChanged(defaultValue);
        }}
      />
    </View>
  );
};

const SettingView = () => {
  const isDarkMode = useColorScheme() === "dark";
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <PaymentMethodsContext.Consumer>
      {(somecontext) => {

        return (
          <SafeAreaView style={[backgroundStyle, { flex: 1 }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <SettingFormView context={somecontext} />
          </SafeAreaView>
        );
      }}
    </PaymentMethodsContext.Consumer>
  );
};

export default SettingView;

