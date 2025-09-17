import { View, type TextInputProps } from 'react-native';
import Styles from './Styles';
import AdaptiveText from './AdaptiveText';
import AdaptiveTextInput from './AdaptiveTextInput';

export type FormTextInputProps = {
  title?: string;
} & TextInputProps;

const FormTextInput = (props: FormTextInputProps) => {
  return (
    <View style={Styles.page}>
      <AdaptiveText style={Styles.paddedTitle}>{props.title}</AdaptiveText>
      <AdaptiveTextInput {...props} style={[props.style, Styles.textInput]} />
    </View>
  );
};

export default FormTextInput;
