import { useAdyenCheckout } from '@adyen/react-native';
import { Text, ActivityIndicator } from 'react-native';
import PageScrollView from '../../common/PageScrollView';
import PaymentMethodsList from './PaymentMethodsList';
import DropInButton from './DropInButton';
import PlatformPayButton from './PlatformPayButton';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckoutStackParamList } from '../../../router/CheckoutNavigator';
import PaymentMethodListItem from './PaymentMethodListItem';

export type PaymentMethodsParams = {
  showDropIn?: boolean;
  showEmbeddedComponents?: boolean;
  showDropBasedComponents?: boolean;
};

export type PaymentMethodsProps = NativeStackScreenProps<
  CheckoutStackParamList,
  'PaymentMethods'
>;

const PaymentMethods = (prop: PaymentMethodsProps) => {
  const { isReady, paymentMethods } = useAdyenCheckout();

  const showDropIn = prop.route.params?.showDropIn ?? false;
  const showEmbeddedComponents =
    prop.route.params?.showEmbeddedComponents ?? false;
  const showDropinBasedComponents =
    prop.route.params?.showDropBasedComponents ?? false;

  if (!isReady) {
    return <ActivityIndicator />;
  }

  if (!paymentMethods) {
    return <Text>No payment methods available</Text>;
  }

  return (
    <PageScrollView>
      {showDropIn && <DropInButton />}

      {showEmbeddedComponents && (
        <>
          <PlatformPayButton />
          <PaymentMethodListItem
            title="Card Component"
            icon="card"
            onPress={() => prop.navigation.navigate('CardForm')}
          />
        </>
      )}

      {showDropinBasedComponents && (
        <PaymentMethodsList paymentMethods={paymentMethods.paymentMethods} />
      )}
    </PageScrollView>
  );
};

export default PaymentMethods;
