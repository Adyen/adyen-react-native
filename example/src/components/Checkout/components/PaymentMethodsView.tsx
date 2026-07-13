import {
  useAdyenCheckout,
  NATIVE_COMPONENTS,
  UNSUPPORTED_PAYMENT_METHODS,
} from '@adyen/react-native';
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
  showInstant?: boolean;
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
  const showInstant = prop.route.params?.showInstant ?? false;

  if (!isReady) {
    return <ActivityIndicator />;
  }

  if (!paymentMethods) {
    return <Text>No payment methods available</Text>;
  }

  const nonNativeMethods = paymentMethods?.paymentMethods.filter(
    (pm) =>
      !NATIVE_COMPONENTS.includes(pm.type) &&
      !UNSUPPORTED_PAYMENT_METHODS.includes(pm.type)
  );
  const nativeMethods = paymentMethods?.paymentMethods.filter((pm) =>
    NATIVE_COMPONENTS.includes(pm.type)
  );

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

      {showInstant && (
        <PaymentMethodsList
          title="Instant components"
          paymentMethods={nonNativeMethods}
        />
      )}

      {showDropinBasedComponents && (
        <PaymentMethodsList
          title="Drop-in based components (deprecated)"
          paymentMethods={nativeMethods}
        />
      )}
    </PageScrollView>
  );
};

export default PaymentMethods;
