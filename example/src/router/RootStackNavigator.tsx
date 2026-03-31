import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Screens from '../components';
import { HomeStackNavigator, HomeStackParamList } from './HomeStackNavigator';
import {
  createNavigationContainerRef,
  NavigatorScreenParams,
} from '@react-navigation/native';
import { ResultCode } from '@adyen/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { modalScreenOptions } from './modalScreenOptions';
import SettingsNavigator from '../components/Settings/SettingsNavigator';

// Root stack screens (modals presented from Home)
export type RootStackParamList = {
  HomeStack: NavigatorScreenParams<HomeStackParamList>;
  Settings: undefined;
  Result: { resultCode: ResultCode };
};

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const RootStack = createNativeStackNavigator<RootStackParamList>();

// Navigation ref for accessing root navigation from anywhere
export const rootNavigationRef =
  createNavigationContainerRef<RootStackParamList>();

export const RootStackNavigator = () => {
  return (
    <RootStack.Navigator>
      <RootStack.Screen
        name="HomeStack"
        component={HomeStackNavigator}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{ ...modalScreenOptions, headerShown: false }}
      />
      <RootStack.Screen
        name="Result"
        component={Screens.ResultView}
        options={modalScreenOptions}
      />
    </RootStack.Navigator>
  );
};
