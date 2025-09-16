import { useCallback, useState } from 'react';
import { type TextInputProps } from 'react-native';
import FormTextInput from '../../common/FormTextInput';

type ExpiryDateInputProps = {
  onChangeText: (value: string) => void;
} & TextInputProps;

const ExpiryDateInput = (props: ExpiryDateInputProps) => {
  const [expiryDate, setExpiryDate] = useState('');
  const { onChangeText } = props;

  const formatExpiryDate = useCallback(
    (input: string) => {
      // Remove all non-digit characters
      const digits = input.replace(/\D/g, '');

      // Limit to 4 digits
      const limitedDigits = digits.slice(0, 4);

      // Format as MM/YY
      let formatted = limitedDigits;
      if (limitedDigits.length >= 3) {
        formatted = `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
      }

      setExpiryDate(formatted);
      onChangeText(formatted);
    },
    [onChangeText]
  );

  return (
    <FormTextInput
      title="Expiry date"
      {...props}
      keyboardType="numeric"
      maxLength={5}
      placeholder="MM/YY"
      value={expiryDate}
      onChangeText={formatExpiryDate}
    />
  );
};

export default ExpiryDateInput;
