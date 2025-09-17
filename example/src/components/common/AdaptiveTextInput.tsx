import { TextInput, useColorScheme, type TextInputProps } from 'react-native';
import Colors from './Assets';

const AdaptiveTextInput = (props: TextInputProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <TextInput
      {...props}
      style={[
        props.style,
        {
          color: isDarkMode ? Colors.textDark : Colors.textLight,
          backgroundColor: isDarkMode
            ? Colors.textBackgroundDark
            : Colors.textBackgroundLight,
        },
      ]}
    />
  );
};

export default AdaptiveTextInput;
