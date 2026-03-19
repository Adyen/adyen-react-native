import { ScrollView, Text } from 'react-native';
import { CardView } from '@adyen/react-native';

const CardForm = () => {
  return (
    <ScrollView>
      <Text>Card Form Header</Text>
      <CardView />
      <Text>Card Form Footer</Text>
    </ScrollView>
  );
};

export default CardForm;
