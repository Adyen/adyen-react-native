import { useAdyenCheckout, type PaymentMethod } from '@adyen/react-native';
import { View } from 'react-native';
import AdaptiveText from '../../common/AdaptiveText';
import PaymentMethodListItem from './PaymentMethodListItem';
import Styles from '../../common/Styles';

interface PaymentMethodsListProps {
  paymentMethods: PaymentMethod[] | undefined;
}

const PaymentMethodsList = ({ paymentMethods }: PaymentMethodsListProps) => {
  const { start } = useAdyenCheckout();

  if (!paymentMethods) {
    return null;
  }

  return (
    <View>
      <AdaptiveText style={Styles.paddedTitle}>
        Components(obsolete)
      </AdaptiveText>
      {paymentMethods.map((paymentMethod) => {
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
