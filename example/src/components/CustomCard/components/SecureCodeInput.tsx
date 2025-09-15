import { useCallback, useState } from 'react';
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
  const [secureCode, setSecureCode] = useState('');
  const { onChangeText, bin } = props;

  const formatCardNumber = useCallback(
    (input: string) => {
      // Remove all non-digit characters
      const digits = input.replace(/\D/g, '');

      let formatted = digits.slice(0, 4);
      if (bin.startsWith('3')) {
        // detect AMEX
        formatted = digits.slice(0, 3);
      }

      setSecureCode(formatted);
      onChangeText(formatted);
    },
    [onChangeText, bin]
  );

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
        value={secureCode}
        onChangeText={formatCardNumber}
        style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
      />
    </View>
  );
};

export default SecureCodeInput;
