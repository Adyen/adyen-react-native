import { useState } from 'react';
import {
  TextInput,
  Text,
  View,
  useColorScheme,
  type TextInputProps,
} from 'react-native';
import Styles from '../../utilities/Styles';

type SecureCodeInputProps = {
  bin: string;
  onChangeText: (value: string) => void;
} & TextInputProps;

const SecureCodeInput = (props: SecureCodeInputProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [cardNumber, setCardNumber] = useState('');

  const formatCardNumber = (input: string) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');

    // Limit to 4 digits
    const limitedDigits = digits.slice(0, 4);

    // Format as MM/YY
    let formatted = limitedDigits;
    if (limitedDigits.length >= 3) {
      formatted = `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
    }

    setCardNumber(formatted);
    props.onChangeText(formatted);
  };

  return (
    <View style={Styles.item}>
      <Text
        style={[
          isDarkMode ? Styles.textDark : Styles.textLight,
          Styles.itemTitle,
        ]}
      >
        {'CVC / CVV'}
      </Text>
      <TextInput
        {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
        editable
        placeholder="123"
        keyboardType="numeric"
        maxLength={4}
        value={cardNumber}
        onChangeText={formatCardNumber}
        style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
      />
    </View>
  );
};

export default SecureCodeInput;
