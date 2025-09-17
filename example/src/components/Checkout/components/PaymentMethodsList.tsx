import { useAdyenCheckout, type PaymentMethod } from '@adyen/react-native';
import { View } from 'react-native';
import AdaptiveText from '../../common/AdaptiveText';
import PaymentMethodListItem from './PaymentMethodListItem';
import Styles from '../../common/Styles';

interface PaymentMethodsListProps {
  regular: PaymentMethod[] | undefined;
}

const PaymentMethodsList = ({ regular }: PaymentMethodsListProps) => {
  const { start } = useAdyenCheckout();

  if (!regular) {
    return null;
  }

  return (
    <View>
      <AdaptiveText style={Styles.paddedTitle}>Components</AdaptiveText>
      {regular.map((paymentMethod) => {
        return (
          <PaymentMethodListItem
            key={paymentMethod.type + paymentMethod.name}
            title={paymentMethod.name}
            icon={icon(paymentMethod)}
            onPress={() => start(paymentMethod.type)}
          />
        );
      })}
    </View>
  );
};

function icon(paymentMethod: PaymentMethod) {
  return paymentMethod.type === 'scheme' ? 'card' : paymentMethod.type;
}

export default PaymentMethodsList;
