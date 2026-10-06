import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { AdyenCheckout } from '@adyen/react-native';
import type { AdyenError, SessionsResult } from '@adyen/react-native';
import Styles from '../common/Styles';
import TopView from './components/TopView';
import DropInButton from './components/DropInButton';
import CheckoutContainer from './components/CheckoutContainer';
import { useAppContext } from '../../hooks/useAppContext';
import { checkoutConfiguration } from '../../settings/checkoutConfiguration';
import { processAdyenError } from './utils/processAdyenError';
import { ENVIRONMENT } from '../../Configuration';

const SessionsDropInCheckout = () => {
  const { configuration, navigateToResults, navigateToRoot, sessionsApi } =
    useAppContext();

  const config = useMemo(
    () => checkoutConfiguration(configuration),
    [configuration]
  );

  const didFail = useCallback(
    async (adyenError: AdyenError) => {
      processAdyenError(adyenError);
      navigateToRoot();
    },
    [navigateToRoot]
  );

  const didComplete = useCallback(
    async (result: SessionsResult) => {
      // TODO: verify server-side via sessionsApi.requestSessionResult once Android forwards a real sessionResult (works on iOS today).
      navigateToResults(result);
    },
    [navigateToResults]
  );

  const sessionsSetup = useCallback(async () => {
    const session = await sessionsApi.requestSession(
      configuration,
      ENVIRONMENT.returnUrl
    );
    return AdyenCheckout.setup(session, config, {
      onComplete: didComplete,
      onError: didFail,
    });
  }, [configuration, sessionsApi, config, didComplete, didFail]);

  return (
    <CheckoutContainer setup={sessionsSetup}>
      {(checkout) => (
        <View style={Styles.page}>
          <TopView />
          <DropInButton checkout={checkout} />
        </View>
      )}
    </CheckoutContainer>
  );
};

export default SessionsDropInCheckout;
