import { View, Switch } from 'react-native';
import Styles from './Styles';
import AdaptiveText from './AdaptiveText';

type FormToggleProps = {
  title: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const FormToggle = ({ title, value, onValueChange }: FormToggleProps) => {
  return (
    <View style={Styles.toggleRow}>
      <AdaptiveText>{title}</AdaptiveText>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
};

export default FormToggle;
