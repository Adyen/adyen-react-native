import { type StyleProp, type ViewStyle } from 'react-native';
import { useCallback } from 'react';
import { PlatformPayView } from '..';

export const GooglePayButtonTheme = {
  DARK: 1,
  LIGHT: 2,
};

export const GooglePayButtonType = {
  BUY: 1,
  BOOK: 2,
  CHECKOUT: 3,
  DONATE: 4,
  ORDER: 5,
  PAY: 6,
  SUBSCRIBE: 7,
  PLAIN: 8,
};

export interface GooglePayButtonProps {
  theme?: keyof typeof GooglePayButtonTheme;
  type?: keyof typeof GooglePayButtonType;
  radius?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function getButtonTheme(type: string): number {
  switch (type) {
    case 'DARK':
      return 1;
    case 'LIGHT':
      return 2;
    default:
      throw new Error(`Unhandled GooglePayButtonType: ${type}`);
  }
}

function getButtonType(type: string): number {
  switch (type) {
    case 'BUY':
      return 1;
    case 'CHECKOUT':
      return 2;
    case 'BOOK':
      return 3;
    case 'DONATE':
      return 4;
    case 'ORDER':
      return 5;
    case 'PAY':
      return 6;
    case 'SUBSCRIBE':
      return 7;
    case 'PLAIN':
      return 8;
    default:
      throw new Error(`Unhandled GooglePayButtonType: ${type}`);
  }
}

export const GooglePayButton = ({
  theme,
  type,
  radius,
  onPress,
  style,
}: GooglePayButtonProps) => {
  const onPressHandler = useCallback(() => {
    console.log('Pressed');
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
