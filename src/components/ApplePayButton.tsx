import { type StyleProp, type ViewStyle } from 'react-native';
import { useCallback } from 'react';
import PlatformPayView from '../specs/NativePlatformPayView';
import Styles from './common/Styles';

export const ApplePayButtonTheme = {
  WHITE: 1,
  WHITE_OUTLINE: 2,
  AUTOMATIC: 3,
  BLACK: 4,
} as const;

export const ApplePayButtonType = {
  BUY: 1,
  SETUP: 2,
  INSTORE: 3,
  DONATE: 4,
  CHECKOUT: 5,
  BOOK: 6,
  SUBSCRIBE: 7,
  RELOAD: 8,
  ADDMONEY: 9,
  TOPUP: 10,
  ORDER: 11,
  RENT: 12,
  SUPPORT: 13,
  CONTRIBUTE: 14,
  TIP: 15,
  CONTINUE: 16,
  PLAIN: 0,
} as const;

export interface ApplePayButtonProps {
  theme?: keyof typeof ApplePayButtonTheme;
  type?: keyof typeof ApplePayButtonType;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function getButtonTheme(type: keyof typeof ApplePayButtonTheme): number {
  return ApplePayButtonTheme[type] ?? ApplePayButtonTheme.WHITE;
}

function getButtonType(type: keyof typeof ApplePayButtonType): number {
  return ApplePayButtonType[type] ?? ApplePayButtonType.BUY;
}

export const ApplePayButton = ({
  theme,
  type,
  radius,
  onPress,
  style,
}: ApplePayButtonProps) => {
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
