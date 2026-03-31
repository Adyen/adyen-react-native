import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingView from './SettingsView';
import CardSettingsView from './CardSettingsView';
import DropInSettingsView from './DropInSettingsView';
import ApplePaySettingsView from './ApplePaySettingsView';
import GooglePaySettingsView from './GooglePaySettingsView';

export type SettingsStackParamList = {
  GeneralSettings: undefined;
  CardSettings: undefined;
  DropInSettings: undefined;
  ApplePaySettings: undefined;
  GooglePaySettings: undefined;
};

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

const SettingsNavigator = () => {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="GeneralSettings"
        component={SettingView}
        options={{ title: 'Settings' }}
      />
      <SettingsStack.Screen
        name="CardSettings"
        component={CardSettingsView}
        options={{ title: 'Card Settings' }}
      />
      <SettingsStack.Screen
        name="DropInSettings"
        component={DropInSettingsView}
        options={{ title: 'Drop-In Settings' }}
      />
      <SettingsStack.Screen
        name="ApplePaySettings"
        component={ApplePaySettingsView}
        options={{ title: 'Apple Pay Settings' }}
      />
      <SettingsStack.Screen
        name="GooglePaySettings"
        component={GooglePaySettingsView}
        options={{ title: 'Google Pay Settings' }}
      />
    </SettingsStack.Navigator>
  );
};

export default SettingsNavigator;
