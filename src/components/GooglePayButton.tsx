import { type StyleProp, type ViewStyle } from 'react-native';
import { useCallback } from 'react';
import PlatformPayView from '../specs/NativePlatformPayView';
import Styles from './common/Styles';

export const GooglePayButtonTheme = {
  DARK: 1,
  LIGHT: 2,
} as const;

export const GooglePayButtonType = {
  BUY: 1,
  BOOK: 2,
  CHECKOUT: 3,
  DONATE: 4,
  ORDER: 5,
  PAY: 6,
  SUBSCRIBE: 7,
  PLAIN: 8,
} as const;

export interface GooglePayButtonProps {
  theme?: keyof typeof GooglePayButtonTheme;
  type?: keyof typeof GooglePayButtonType;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function getButtonTheme(type: keyof typeof GooglePayButtonTheme): number {
  return GooglePayButtonTheme[type] ?? GooglePayButtonTheme.DARK;
}

function getButtonType(type: keyof typeof GooglePayButtonType): number {
  return GooglePayButtonType[type] ?? GooglePayButtonType.PAY;
}

export const GooglePayButton = ({
  theme,
  type,
  radius,
  onPress,
  style,
}: GooglePayButtonProps) => {
  const onPressHandler = useCallback(() => {
    onPress?.();
  }, [onPress]);

  return (
    <PlatformPayView
      theme={theme ? getButtonTheme(theme) : undefined}
      type={type ? getButtonType(type) : undefined}
      radius={radius}
      onButtonPress={onPressHandler}
      style={[Styles.defaultButton, style]}
    />
  );
};
