import { useCallback, useState } from 'react';
import { type TextInputProps } from 'react-native';
import FormTextInput from '../../common/FormTextInput';

type CardNumberInputProps = {
  onChangeText: (value: string) => void;
} & TextInputProps;

const CardNumberInput = (props: CardNumberInputProps) => {
  const [cardNumber, setCardNumber] = useState('');
  const { onChangeText } = props;

  const formatCardNumber = useCallback(
    (input: string) => {
      // Remove all non-digit characters
      const digits = input.replace(/\D/g, '');

      // Limit to 16 digits (optional, based on card type)
      const limitedDigits = digits.slice(0, 16);

      // Add a space after every 4 digits
      const formatted = limitedDigits.replace(/(.{4})/g, '$1 ').trim();

      setCardNumber(formatted);
      onChangeText(formatted);
    },
    [onChangeText]
  );

  return (
    <FormTextInput
      title="Card number"
      {...props}
      keyboardType="numeric"
      maxLength={19}
      placeholder="1234 5678 9012 3456"
      value={cardNumber}
      onChangeText={formatCardNumber}
    />
  );
};

export default CardNumberInput;
