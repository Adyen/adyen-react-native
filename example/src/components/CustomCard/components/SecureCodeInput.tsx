import { useCallback, useState } from 'react';
import { type TextInputProps } from 'react-native';
import FormTextInput from '../../common/FormTextInput';

type SecureCodeInputProps = {
  bin: string;
  onChangeText: (value: string) => void;
} & TextInputProps;

const SecureCodeInput = (props: SecureCodeInputProps) => {
  const [secureCode, setSecureCode] = useState('');
  const { onChangeText, bin } = props;

  const formatSecureCode = useCallback(
    (input: string) => {
      // Remove all non-digit characters
      const digits = input.replace(/\D/g, '');

      // Detect AMEX
      const length = bin.startsWith('3') ? 4 : 3;
      let formatted = digits.slice(0, length);

      setSecureCode(formatted);
      onChangeText(formatted);
    },
    [onChangeText, bin]
  );

  return (
    <FormTextInput
      title="CVC / CVV"
      {...props}
      keyboardType="numeric"
      maxLength={4}
      placeholder="123"
      value={secureCode}
      onChangeText={formatSecureCode}
    />
  );
};

export default SecureCodeInput;
