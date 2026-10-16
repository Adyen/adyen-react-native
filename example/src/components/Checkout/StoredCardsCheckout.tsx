import { View } from 'react-native';
import Styles from '../common/Styles';
import PageScrollView from '../common/PageScrollView';
import TopView from './components/TopView';
import CheckoutContainer from './components/CheckoutContainer';
import StoredPaymentMethodsList from './components/StoredPaymentMethodsList';
import { useAdvancedCheckoutSetup } from '../../hooks/useAdvancedCheckoutSetup';

const StoredCardsCheckout = () => {
  const advancedSetup = useAdvancedCheckoutSetup();

  return (
    <CheckoutContainer setup={advancedSetup}>
      {(checkout) => (
        <View style={Styles.page}>
          <TopView />
          <PageScrollView>
            <StoredPaymentMethodsList checkout={checkout} />
          </PageScrollView>
        </View>
      )}
    </CheckoutContainer>
  );
};

export default StoredCardsCheckout;
