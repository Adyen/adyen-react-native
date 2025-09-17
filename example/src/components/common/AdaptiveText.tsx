import { type TextProps, Text, useColorScheme } from 'react-native';
import Colors from './Assets';

const AdaptiveText = (props: TextProps) => {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <Text
      {...props}
      style={[
        { color: isDarkMode ? Colors.textDark : Colors.textLight },
        props.style,
      ]}
    >
      {props.children}
    </Text>
  );
};

export default AdaptiveText;
