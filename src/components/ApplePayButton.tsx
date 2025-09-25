import { type StyleProp, type ViewStyle } from 'react-native';
import { useCallback } from 'react';
import { PlatformPayView } from '..';

export const ApplePayButtonTheme = {
  WHITE: 1,
  WHITE_OUTLINE: 2,
  AUTOMATIC: 3,
  BLACK: 4,
};

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
};

export interface ApplePayButtonProps {
  theme?: keyof typeof ApplePayButtonTheme;
  type?: keyof typeof ApplePayButtonType;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function getButtonTheme(type: string): number {
  switch (type) {
    case 'WHITE':
      return 1;
    case 'WHITE_OUTLINE':
      return 2;
    case 'AUTOMATIC':
      return 3;
    default:
      return 0;
  }
}

function getButtonType(type: string): number {
  switch (type) {
    case 'BUY':
      return 1;
    case 'SETUP':
      return 2;
    case 'INSTORE':
      return 3;
    case 'DONATE':
      return 4;
    case 'CHECKOUT':
      return 5;
    case 'BOOK':
      return 6;
    case 'SUBSCRIBE':
      return 7;
    case 'RELOAD':
      return 8;
    case 'ADDMONEY':
      return 9;
    case 'TOPUP':
      return 10;
    case 'ORDER':
      return 11;
    case 'RENT':
      return 12;
    case 'SUPPORT':
      return 13;
    case 'CONTRIBUTE':
      return 14;
    case 'TIP':
      return 15;
    case 'CONTINUE':
      return 16;
    default:
      return 0;
  }
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

  const defaultSize = { minWidth: 200, minHeight: 50 };
  return (
    <PlatformPayView
      theme={theme ? getButtonTheme(theme) : undefined}
      type={type ? getButtonType(type) : undefined}
      radius={radius}
      onButtonPress={onPressHandler}
      style={[defaultSize, style]}
    />
  );
};
