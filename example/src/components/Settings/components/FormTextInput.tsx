import {
  useColorScheme,
  View,
  TextInput,
  Text,
  type TextInputProps,
} from 'react-native';
import Styles from '../../utilities/Styles';

export type FormTextInputProps = {
  title?: string;
} & TextInputProps;

const FormTextInput = (pros: FormTextInputProps) => {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={Styles.item}>
      <Text
        style={[
          isDarkMode ? Styles.textDark : Styles.textLight,
          Styles.itemTitle,
        ]}
      >
        {pros.title}
      </Text>
      <TextInput
        {...pros}
        value={pros.value}
        onChangeText={pros.onChangeText}
        style={isDarkMode ? Styles.textInputDark : Styles.textInputLight}
      />
    </View>
  );
};

export default FormTextInput;
