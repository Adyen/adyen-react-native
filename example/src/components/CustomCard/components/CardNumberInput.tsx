import { useState } from 'react';
import {
  TextInput,
  Text,
  View,
  useColorScheme,
  type TextInputProps,
} from 'react-native';
import Styles from '../../utilities/Styles';

type CardNumberInputProps = {
  onChangeText: (value: string) => void;
} & TextInputProps;

const CardNumberInput = (props: CardNumberInputProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  const [cardNumber, setCardNumber] = useState('');

  const formatCardNumber = (input: string) => {
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');

    // Limit to 16 digits (optional, based on card type)
    const limitedDigits = digits.slice(0, 16);

    // Add a space after every 4 digits
    const formatted = limitedDigits.replace(/(.{4})/g, '$1 ').trim();

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
        {"Card number"}
      </Text>
      <TextInput
        {...props} // Inherit any props passed to it; e.g., multiline, numberOfLines below
        editable
        keyboardType="numeric"
        maxLength={19} // 16 digits + 3 spaces
        placeholder="1234 5678 9012 3456"
        value={cardNumber}
        onChangeText={formatCardNumber}
        style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
      />
    </View>
  );
};

export default CardNumberInput;
