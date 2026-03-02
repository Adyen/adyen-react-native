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

      // Auto-prefix '0' when first digit is 2-9
      const prefixed =
        digits.length === 1 && parseInt(digits[0]!, 10) > 1
          ? `0${digits}`
          : digits;

      // Limit to 4 digits
      const limitedDigits = prefixed.slice(0, 4);

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
