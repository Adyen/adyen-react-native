import { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../../hooks/useAppContext';
import Styles from '../common/Styles';
import { Button, ScrollView, TouchableOpacity, View } from 'react-native';
import FormTextInput from '../common/FormTextInput';
import FormSearchDropdown from './common/FormSearchDropdown';
import AdaptiveText from '../common/AdaptiveText';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SettingsStackParamList } from './SettingsNavigator';
import {
  COUNTRY_CODES,
  getCountryLabel,
  getCurrency,
} from '../../assets/countries';

type Props = NativeStackScreenProps<SettingsStackParamList, 'GeneralSettings'>;

const SettingView = ({ navigation }: Props) => {
  const { configuration, save, navigateToRoot } = useAppContext();

  const [countryCode, setCountryCode] = useState(configuration.countryCode);
  const [amount, setAmount] = useState(String(configuration.amount));
  const [merchantAccount, setMerchantAccount] = useState(
    configuration.merchantAccount
  );
  const [shopperReference, setShopperReference] = useState(
    configuration.shopperReference
  );
  const [shopperLocale, setShopperLocale] = useState(
    configuration.shopperLocale
  );

  const currency = getCurrency(countryCode) ?? configuration.currency;

  const settings = useMemo(
    () => ({
      ...configuration,
      countryCode: countryCode,
      amount: Number(amount),
      currency: currency,
      merchantAccount: merchantAccount,
      shopperLocale: shopperLocale,
      shopperReference: shopperReference,
    }),
    [
      configuration,
      countryCode,
      amount,
      currency,
      merchantAccount,
      shopperLocale,
      shopperReference,
    ]
  );

  const insets = useSafeAreaInsets();

  const saveAndClose = useCallback(() => {
    save(settings);
    navigateToRoot();
  }, [settings, save, navigateToRoot]);

  return (
    <ScrollView
      style={Styles.page}
      contentContainerStyle={{ paddingBottom: insets.bottom }}
    >
      <FormSearchDropdown
        title="Country"
        value={countryCode}
        options={COUNTRY_CODES}
        onChange={setCountryCode}
        labelExtractor={getCountryLabel}
      />
      <FormTextInput
        title="Amount"
        value={amount.toString()}
        inputMode={'numeric'}
        onChangeText={setAmount}
      />
      <FormTextInput
        title="Merchant Account"
        value={merchantAccount}
        onChangeText={setMerchantAccount}
      />
      <FormTextInput
        title="Shopper locale"
        value={shopperLocale}
        maxLength={5}
        onChangeText={setShopperLocale}
      />
      <FormTextInput
        title="Shopper Reference"
        value={shopperReference}
        onChangeText={setShopperReference}
      />

      <AdaptiveText style={Styles.sectionTitle}>
        Component Settings
      </AdaptiveText>
      <TouchableOpacity
        style={Styles.transparentButton}
        onPress={() => navigation.navigate('CardSettings')}
      >
        <AdaptiveText style={Styles.transparentButtonText}>
          Card Settings
        </AdaptiveText>
      </TouchableOpacity>
      <TouchableOpacity
        style={Styles.transparentButton}
        onPress={() => navigation.navigate('DropInSettings')}
      >
        <AdaptiveText style={Styles.transparentButtonText}>
          Drop-In Settings
        </AdaptiveText>
      </TouchableOpacity>
      <TouchableOpacity
        style={Styles.transparentButton}
        onPress={() => navigation.navigate('ApplePaySettings')}
      >
        <AdaptiveText style={Styles.transparentButtonText}>
          Apple Pay Settings
        </AdaptiveText>
      </TouchableOpacity>
      <TouchableOpacity
        style={Styles.transparentButton}
        onPress={() => navigation.navigate('GooglePaySettings')}
      >
        <AdaptiveText style={Styles.transparentButtonText}>
          Google Pay Settings
        </AdaptiveText>
      </TouchableOpacity>

      <View style={Styles.formAction}>
        <Button title="Save" onPress={saveAndClose} />
      </View>
    </ScrollView>
  );
};

export default SettingView;
