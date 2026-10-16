import CheckoutContainer from './components/CheckoutContainer';
import PaymentMethodsList from './components/PaymentMethodsList';
import { useAdvancedCheckoutSetup } from '../../hooks/useAdvancedCheckoutSetup';

const AdvancedCheckout = () => {
  const advancedSetup = useAdvancedCheckoutSetup();

  return (
    <CheckoutContainer setup={advancedSetup}>
      {(checkout) => <PaymentMethodsList checkout={checkout} />}
    </CheckoutContainer>
  );
};

export default AdvancedCheckout;
